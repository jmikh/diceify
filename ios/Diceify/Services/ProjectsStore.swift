import DiceCore
import Foundation
import Observation
import os

private let log = Logger(subsystem: "art.diceify.app", category: "projects")

/// The project list and the lifecycle around it (features/editor/hooks/useProjects.ts + useStartProject.ts):
/// local folders (drafts, cached cloud projects) merged with the cloud rows; create from a photo; rename; delete;
/// the signed-out draft becomes a cloud project when the user signs in.
@MainActor
@Observable
final class ProjectsStore {
    struct Item: Identifiable, Equatable, Sendable {
        let id: UUID
        var name: String
        var totalDice: Int
        var completedDice: Int
        var updatedAt: Date
        /// Local file, else a signed cloud URL, else nothing yet.
        var previewURL: URL?
        /// Never saved to the cloud (the signed-out draft, or an upload that has not happened yet).
        var isLocalOnly: Bool

        var percent: Double { totalDice > 0 ? min(100, Double(completedDice) * 100 / Double(totalDice)) : 0 }
    }

    private(set) var items: [Item] = []
    private(set) var loading = false
    var error: String?

    let local: LocalStore
    private let repository = ProjectRepository()

    init(local: LocalStore = .default) {
        self.local = local
    }

    // MARK: Listing

    /// Rebuild the list: local entries first (they may be ahead of the cloud), then cloud rows not cached locally.
    func refresh(userId: UUID?) async {
        loading = true
        defer { loading = false }
        var merged: [UUID: Item] = [:]
        for entry in local.list() {
            merged[entry.id] = Item(id: entry.id, name: entry.meta.name, totalDice: entry.meta.totalDice, completedDice: entry.meta.completedDice, updatedAt: entry.meta.updatedAt, previewURL: entry.hasPreview ? entry.previewURL : nil, isLocalOnly: entry.meta.cloudVersion == nil)
        }
        if let userId {
            do {
                let rows = try await repository.list()
                let previews = (try? await repository.previewURLs(rows.filter { merged[$0.id]?.previewURL == nil })) ?? [:]
                for row in rows {
                    if var existing = merged[row.id] {
                        if !(local.entry(row.id)?.meta.dirty ?? false) {
                            existing.name = row.name
                            existing.totalDice = row.totalDice
                            existing.completedDice = row.completedDice
                            existing.updatedAt = max(existing.updatedAt, row.updatedAt)
                        }
                        if existing.previewURL == nil { existing.previewURL = previews[row.id] }
                        merged[row.id] = existing
                    } else {
                        merged[row.id] = Item(id: row.id, name: row.name, totalDice: row.totalDice, completedDice: row.completedDice, updatedAt: row.updatedAt, previewURL: previews[row.id], isLocalOnly: false)
                    }
                }
                _ = userId
            } catch {
                self.error = "Could not load your projects."
                log.error("list failed: \(String(describing: error), privacy: .public)")
            }
        }
        items = merged.values.sorted { $0.updatedAt > $1.updatedAt }
    }

    // MARK: Create

    /// A picked photo becomes a new project: locally at once, in the cloud when signed in (a failed upload keeps it local).
    func create(fromPhoto data: Data, userId: UUID?) async throws -> UUID {
        let imported = try ImageKit.importPhoto(data)
        let id = UUID()
        log.notice("import: \(data.count) bytes → project \(id.uuidString, privacy: .public), signed in: \(userId != nil)")
        let name = "Untitled Project"
        if userId == nil {
            // Signed out: one draft in this app (the web keeps one per browser); a new photo replaces it.
            for entry in local.list() where entry.meta.cloudVersion == nil { try local.delete(entry.id) }
        }
        try local.create(id: id, name: name, image: imported.original, preview: imported.preview)
        if let userId { await upload(id, userId: userId) }
        await refresh(userId: userId)
        return id
    }

    /// Push a local-only project to the cloud (create row + image + preview). Failure leaves it local and dirty.
    func upload(_ id: UUID, userId: UUID) async {
        guard let entry = local.entry(id), entry.meta.cloudVersion == nil else { return }
        do {
            let document = try local.document(id)
            let record = try await repository.create(id: id, userId: userId, name: entry.meta.name, document: document, image: try local.image(id))
            try local.update(id) { meta in
                meta.cloudVersion = record.summary.cloudVersion
                meta.imagePath = record.summary.imagePath
                meta.dirty = false
            }
            if let preview = try? Data(contentsOf: entry.previewURL) {
                try? await repository.uploadPreview(ProjectPaths.preview(for: record.summary.imagePath), preview)
            }
            log.notice("uploaded \(id.uuidString, privacy: .public) as cloud version \(record.summary.cloudVersion)")
        } catch {
            log.error("upload of \(id.uuidString, privacy: .public) failed, kept local: \(String(describing: error), privacy: .public)")
        }
    }

    /// After sign-in: every local-only project (the draft) becomes a cloud project (`saveDraftAsProject`).
    func promoteDrafts(userId: UUID) async {
        for entry in local.list() where entry.meta.cloudVersion == nil {
            await upload(entry.id, userId: userId)
        }
        await refresh(userId: userId)
    }

    // MARK: Rename / delete

    func rename(_ id: UUID, to name: String, userId: UUID?) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        try? local.update(id) { $0.name = trimmed; $0.updatedAt = Date() }
        if userId != nil, let version = local.entry(id)?.meta.cloudVersion {
            if case let .ok(newVersion)? = try? await repository.rename(id, name: trimmed, expectedVersion: version) {
                try? local.update(id) { $0.cloudVersion = newVersion }
            }
        } else if userId != nil, local.entry(id) == nil, let item = items.first(where: { $0.id == id }) {
            // A cloud-only project (not cached): read its version from the row
            _ = item
            if let record = try? await repository.get(id), case .ok? = try? await repository.save(id, name: trimmed, document: record.document, expectedVersion: record.summary.cloudVersion) {}
        }
        await refresh(userId: userId)
    }

    func delete(_ id: UUID, userId: UUID?) async {
        try? local.delete(id)
        if userId != nil { try? await repository.delete(id) }
        await refresh(userId: userId)
    }

    /// After sign-out: cached cloud projects go (another account may sign in next); nothing is local-only by then.
    func clearCloudCache() async {
        for entry in local.list() where entry.meta.cloudVersion != nil { try? local.delete(entry.id) }
        await refresh(userId: nil)
    }

    /// Fetch a cloud project into the local cache (document + original) so it can be opened and edited offline.
    func cache(_ id: UUID, userId: UUID) async throws -> LocalStore.Entry {
        if let entry = local.entry(id) { return entry }
        guard let record = try await repository.get(id) else { throw CocoaError(.fileNoSuchFile) }
        let image = try await repository.downloadImage(record.summary.imagePath)
        let preview = try? ImageKit.encodeJPEG(try ImageKit.decode(image, maxSide: ImageKit.previewMaxSide), quality: ImageKit.previewQuality)
        return try local.create(id: id, name: record.summary.name, image: image, preview: preview, document: record.document, cloudVersion: record.summary.cloudVersion, imagePath: record.summary.imagePath)
    }
}
