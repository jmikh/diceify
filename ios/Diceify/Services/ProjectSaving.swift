import DiceCore
import Foundation

/// What the editor's autosave needs from the cloud (a slice of `ProjectRepository`), so tests can fake it.
protocol ProjectSaving: Sendable {
    func save(_ id: UUID, name: String, document: ProjectDocument, expectedVersion: Int) async throws -> ProjectRepository.SaveResult
    func uploadPreview(_ path: String, _ jpeg: Data) async throws
}

extension ProjectRepository: ProjectSaving {}
