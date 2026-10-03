import DiceCore
import Foundation

/// Projects on disk (plans/ios/ios-app-plan.md § 4): `Documents/Projects/<id>/{original.jpg, document.json,
/// preview.jpg, meta.json}`. A project without `cloudVersion` is local-only (the signed-out draft, or a project whose
/// upload has not happened yet). Every opened cloud project is cached here too, so Build works offline.
struct LocalStore: Sendable {
    struct Meta: Codable, Equatable, Sendable {
        var name: String
        /// nil = never saved to the cloud (local-only).
        var cloudVersion: Int?
        var imagePath: String?
        var updatedAt: Date
        var totalDice: Int
        var completedDice: Int
        /// Local changes not yet saved to the cloud.
        var dirty: Bool
    }

    struct Entry: Identifiable, Equatable, Sendable {
        let id: UUID
        var meta: Meta
        var folder: URL

        var originalURL: URL { folder.appendingPathComponent("original.jpg") }
        var documentURL: URL { folder.appendingPathComponent("document.json") }
        var previewURL: URL { folder.appendingPathComponent("preview.jpg") }
        var hasPreview: Bool { FileManager.default.fileExists(atPath: previewURL.path) }
    }

    let root: URL

    init(root: URL) {
        self.root = root
    }

    /// The app's Documents/Projects.
    static let `default` = LocalStore(root: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Projects", isDirectory: true))

    private func folder(_ id: UUID) -> URL { root.appendingPathComponent(id.uuidString.lowercased(), isDirectory: true) }

    func entry(_ id: UUID) -> Entry? {
        let folder = folder(id)
        guard let data = try? Data(contentsOf: folder.appendingPathComponent("meta.json")), let meta = try? JSONDecoder.store.decode(Meta.self, from: data) else { return nil }
        return Entry(id: id, meta: meta, folder: folder)
    }

    /// Every stored project, most recently updated first.
    func list() -> [Entry] {
        guard let names = try? FileManager.default.contentsOfDirectory(atPath: root.path) else { return [] }
        return names.compactMap { UUID(uuidString: $0) }.compactMap(entry).sorted { $0.meta.updatedAt > $1.meta.updatedAt }
    }

    /// Create a project folder from an imported JPEG (and an optional small preview), with the default document.
    @discardableResult
    func create(id: UUID = UUID(), name: String, image: Data, preview: Data?, document: ProjectDocument = .createDefault(), cloudVersion: Int? = nil, imagePath: String? = nil) throws -> Entry {
        let folder = folder(id)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try image.write(to: folder.appendingPathComponent("original.jpg"), options: .atomic)
        if let preview { try preview.write(to: folder.appendingPathComponent("preview.jpg"), options: .atomic) }
        try document.jsonData().write(to: folder.appendingPathComponent("document.json"), options: .atomic)
        let stats = document.stats
        let meta = Meta(name: name, cloudVersion: cloudVersion, imagePath: imagePath, updatedAt: Date(), totalDice: stats.totalDice, completedDice: stats.completedDice, dirty: cloudVersion == nil)
        try writeMeta(meta, folder: folder)
        return Entry(id: id, meta: meta, folder: folder)
    }

    func document(_ id: UUID) throws -> ProjectDocument {
        try migrateDocument(json: try Data(contentsOf: folder(id).appendingPathComponent("document.json")))
    }

    func image(_ id: UUID) throws -> Data {
        try Data(contentsOf: folder(id).appendingPathComponent("original.jpg"))
    }

    /// Store a document (and its derived stats) for `id`; `dirty` marks it as awaiting a cloud save.
    func writeDocument(_ id: UUID, _ document: ProjectDocument, dirty: Bool) throws {
        guard var entry = entry(id) else { throw CocoaError(.fileNoSuchFile) }
        try document.jsonData().write(to: entry.documentURL, options: .atomic)
        let stats = document.stats
        entry.meta.totalDice = stats.totalDice
        entry.meta.completedDice = stats.completedDice
        entry.meta.updatedAt = Date()
        entry.meta.dirty = dirty
        try writeMeta(entry.meta, folder: entry.folder)
    }

    func writePreview(_ id: UUID, _ jpeg: Data) throws {
        try jpeg.write(to: folder(id).appendingPathComponent("preview.jpg"), options: .atomic)
    }

    func update(_ id: UUID, _ change: (inout Meta) -> Void) throws {
        guard var entry = entry(id) else { throw CocoaError(.fileNoSuchFile) }
        change(&entry.meta)
        try writeMeta(entry.meta, folder: entry.folder)
    }

    func delete(_ id: UUID) throws {
        let folder = folder(id)
        if FileManager.default.fileExists(atPath: folder.path) { try FileManager.default.removeItem(at: folder) }
    }

    private func writeMeta(_ meta: Meta, folder: URL) throws {
        try JSONEncoder.store.encode(meta).write(to: folder.appendingPathComponent("meta.json"), options: .atomic)
    }
}

// Dates as `toISOString()` (millisecond precision: `.iso8601` alone drops fractions and makes same-second ties).
extension JSONDecoder {
    static let store: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let raw = try decoder.singleValueContainer().decode(String.self)
            guard let date = parseISODate(raw) else { throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "bad date \(raw)")) }
            return date
        }
        return d
    }()
}

extension JSONEncoder {
    static let store: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .custom { date, encoder in
            var c = encoder.singleValueContainer()
            try c.encode(isoString(date))
        }
        e.outputFormatting = [.sortedKeys]
        return e
    }()
}
