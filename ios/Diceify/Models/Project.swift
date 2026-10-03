import DiceCore
import Foundation
import Supabase

/// A project row as listed (lib/supabase/projects.ts `ProjectSummary`).
struct ProjectSummary: Identifiable, Equatable, Sendable, Decodable {
    let id: UUID
    let name: String
    let totalDice: Int
    let completedDice: Int
    let percentComplete: Double
    let cloudVersion: Int
    let createdAt: Date
    let updatedAt: Date
    let imagePath: String

    enum CodingKeys: String, CodingKey {
        case id, name
        case totalDice = "total_dice"
        case completedDice = "completed_dice"
        case percentComplete = "percent_complete"
        case cloudVersion = "cloud_version"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case imagePath = "image_path"
    }

    static let columns = "id,name,total_dice,completed_dice,percent_complete,cloud_version,created_at,updated_at,image_path"

    init(id: UUID, name: String, totalDice: Int, completedDice: Int, percentComplete: Double, cloudVersion: Int, createdAt: Date, updatedAt: Date, imagePath: String) {
        self.id = id
        self.name = name
        self.totalDice = totalDice
        self.completedDice = completedDice
        self.percentComplete = percentComplete
        self.cloudVersion = cloudVersion
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.imagePath = imagePath
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        totalDice = try c.decode(Int.self, forKey: .totalDice)
        completedDice = try c.decode(Int.self, forKey: .completedDice)
        percentComplete = try c.decodeIfPresent(Double.self, forKey: .percentComplete) ?? 0
        cloudVersion = try c.decode(Int.self, forKey: .cloudVersion)
        createdAt = try c.decode(Date.self, forKey: .createdAt)
        updatedAt = try c.decode(Date.self, forKey: .updatedAt)
        imagePath = try c.decode(String.self, forKey: .imagePath)
    }
}

/// The full row: summary + document (`ProjectRecord`). The document is validated/migrated on read.
struct ProjectRecord: Equatable, Sendable {
    let summary: ProjectSummary
    let document: ProjectDocument

    /// PostgREST row with `document` as JSON.
    struct Row: Decodable {
        let summary: ProjectSummary
        let document: AnyJSON

        init(from decoder: Decoder) throws {
            summary = try ProjectSummary(from: decoder)
            let c = try decoder.container(keyedBy: Key.self)
            document = try c.decode(AnyJSON.self, forKey: .document)
        }

        private enum Key: String, CodingKey { case document }

        func record() throws -> ProjectRecord {
            ProjectRecord(summary: summary, document: try migrateDocument(document.value))
        }
    }
}

enum ProjectPaths {
    static let bucket = "project-images"

    static func image(userId: UUID, projectId: UUID) -> String { "\(userId.uuidString.lowercased())/\(projectId.uuidString.lowercased())/original.jpg" }
    static func preview(userId: UUID, projectId: UUID) -> String { "\(userId.uuidString.lowercased())/\(projectId.uuidString.lowercased())/preview.jpg" }
    /// The thumbnail lives next to the original: same folder, `preview.jpg`.
    static func preview(for imagePath: String) -> String {
        var parts = imagePath.split(separator: "/").map(String.init)
        parts[parts.count - 1] = "preview.jpg"
        return parts.joined(separator: "/")
    }
}
