import DiceCore
import Foundation
import Supabase

/// Project rows and images under RLS (lib/supabase/projects.ts, storage.ts): list, get, create (upload → insert),
/// compare-and-set save, delete, signed thumbnail URLs.
struct ProjectRepository: Sendable {
    enum SaveResult: Sendable { case ok(cloudVersion: Int); case conflict(ProjectRecord?) }

    private var client: SupabaseClient { SupabaseService.client }
    private var bucket: StorageFileApi { client.storage.from(ProjectPaths.bucket) }

    func list() async throws -> [ProjectSummary] {
        try await client.from("projects").select(ProjectSummary.columns).order("updated_at", ascending: false).execute().value
    }

    /// The full row, or nil when it does not exist (or belongs to someone else: RLS hides it).
    func get(_ id: UUID) async throws -> ProjectRecord? {
        let rows: [ProjectRecord.Row] = try await client.from("projects").select().eq("id", value: id.uuidString.lowercased()).limit(1).execute().value
        return try rows.first?.record()
    }

    /// Upload first, then insert: an orphaned object is cheap and invisible, an orphaned row would point at nothing.
    func create(id: UUID, userId: UUID, name: String, document: ProjectDocument, image: Data) async throws -> ProjectRecord {
        let imagePath = ProjectPaths.image(userId: userId, projectId: id)
        try await bucket.upload(imagePath, data: image, options: FileOptions(contentType: "image/jpeg", upsert: false))
        let stats = document.stats
        struct Insert: Encodable {
            let id: String, owner_id: String, name: String, document: AnyJSON, image_path: String, total_dice: Int, completed_dice: Int
        }
        let row = Insert(id: id.uuidString.lowercased(), owner_id: userId.uuidString.lowercased(), name: name, document: try document.anyJSON(), image_path: imagePath, total_dice: stats.totalDice, completed_dice: stats.completedDice)
        do {
            let inserted: [ProjectRecord.Row] = try await client.from("projects").insert(row).select().execute().value
            guard let first = inserted.first else { throw RepositoryError.emptyInsert }
            return try first.record()
        } catch {
            _ = try? await bucket.remove(paths: [imagePath])
            throw error
        }
    }

    /// Compare-and-set on `cloud_version`: zero updated rows means someone else saved first (or the project is gone).
    func save(_ id: UUID, name: String, document: ProjectDocument, expectedVersion: Int) async throws -> SaveResult {
        let stats = document.stats
        struct Patch: Encodable { let name: String; let document: AnyJSON; let total_dice: Int; let completed_dice: Int }
        let patch = Patch(name: name, document: try document.anyJSON(), total_dice: stats.totalDice, completed_dice: stats.completedDice)
        struct Version: Decodable { let cloud_version: Int }
        let updated: [Version] = try await client.from("projects").update(patch)
            .eq("id", value: id.uuidString.lowercased())
            .eq("cloud_version", value: expectedVersion)
            .select("cloud_version").execute().value
        if let version = updated.first { return .ok(cloudVersion: version.cloud_version) }
        return .conflict(try await get(id))
    }

    func rename(_ id: UUID, name: String, expectedVersion: Int) async throws -> SaveResult {
        guard let record = try await get(id) else { return .conflict(nil) }
        return try await save(id, name: name, document: record.document, expectedVersion: expectedVersion)
    }

    /// Delete the row, then its image and thumbnail. A row that is already gone is a no-op.
    func delete(_ id: UUID) async throws {
        struct Path: Decodable { let image_path: String }
        let rows: [Path] = try await client.from("projects").delete().eq("id", value: id.uuidString.lowercased()).select("image_path").execute().value
        if let path = rows.first?.image_path {
            try await removeObjects([path, ProjectPaths.preview(for: path)])
        }
    }

    /// Remove objects; missing ones are not an error (the row may have outlived them, or vice versa).
    private func removeObjects(_ paths: [String]) async throws {
        do {
            _ = try await bucket.remove(paths: paths)
        } catch let error as StorageError where error.statusCode == "404" || error.error == "not_found" {
            // nothing to remove
        }
    }

    func downloadImage(_ path: String) async throws -> Data {
        try await bucket.download(path: path)
    }

    /// Write (or replace) the project's thumbnail.
    func uploadPreview(_ path: String, _ jpeg: Data) async throws {
        try await bucket.upload(path, data: jpeg, options: FileOptions(contentType: "image/jpeg", upsert: true))
    }

    /// Signed thumbnail URLs by project id (1 h); projects without a thumbnail are left out.
    func previewURLs(_ projects: [ProjectSummary]) async throws -> [UUID: URL] {
        guard !projects.isEmpty else { return [:] }
        let paths = projects.map { ProjectPaths.preview(for: $0.imagePath) }
        let signed = try await bucket.createSignedURLs(paths: paths, expiresIn: 3600)
        var out: [UUID: URL] = [:]
        for (project, result) in zip(projects, signed) {
            if let url = result.signedURL { out[project.id] = url }
        }
        return out
    }
}

enum RepositoryError: Error { case emptyInsert }

extension ProjectDocument {
    /// The document as the SDK's JSON value (for `insert`/`update` payloads).
    func anyJSON() throws -> AnyJSON {
        try JSONDecoder().decode(AnyJSON.self, from: jsonData())
    }
}
