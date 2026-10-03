import CoreGraphics
import DiceCore
import Foundation
import Supabase
import Testing
@testable import Diceify

/// The data layer against the LOCAL stack (like lib/supabase/projects.integration.test.ts): sign in as a password
/// user, create (upload + insert), list, CAS save, conflict, rename, previews, delete. Needs `npm run db:start` and
/// the scheme's DICEIFY_SUPABASE_TEST=1 (project.yml); the user `ios-dev@test.dev` is created by the Admin API
/// (plans/ios/ios-step-3.md).
@Suite(.serialized, .enabled(if: ProcessInfo.processInfo.environment["DICEIFY_SUPABASE_TEST"] == "1"))
struct ProjectRepositoryTests {
    let repository = ProjectRepository()

    private func signIn() async throws -> UUID {
        let session = try await SupabaseService.client.auth.signIn(email: "ios-dev@test.dev", password: "pass1234")
        return session.user.id
    }

    @Test func fullLifecycle() async throws {
        let userId = try await signIn()
        let id = UUID()
        let jpeg = try syntheticJPEG()
        let image = try ImageKit.importPhoto(try #require(jpeg))
        var document = ProjectDocument.createDefault()
        document.crop = CropParams(x: 0, y: 0, width: 300, height: 300, rotation: 0, aspectRatio: .square)
        document.step = .tune

        // create
        let created = try await repository.create(id: id, userId: userId, name: "Repo test", document: document, image: image.original)
        #expect(created.summary.id == id && created.summary.cloudVersion == 1 && created.summary.imagePath == ProjectPaths.image(userId: userId, projectId: id))
        #expect(created.document == document)
        try await repository.uploadPreview(ProjectPaths.preview(for: created.summary.imagePath), image.preview)

        // list + previews
        let listed = try await repository.list()
        #expect(listed.contains { $0.id == id && $0.name == "Repo test" })
        let previews = try await repository.previewURLs(listed.filter { $0.id == id })
        #expect(previews[id] != nil)
        #expect(try await repository.downloadImage(created.summary.imagePath) == image.original)

        // CAS save: the right version wins, a stale one gets the current row back
        document.step = .build
        document.grid = StoredGrid(width: 10, height: 10, rows: nil)
        document.buildProgress = GridPos(x: 5, y: 2)
        guard case let .ok(v2) = try await repository.save(id, name: "Renamed", document: document, expectedVersion: 1) else { Issue.record("save refused"); return }
        #expect(v2 == 2)
        let fetchedOptional = try await repository.get(id)
        let fetched = try #require(fetchedOptional)
        #expect(fetched.summary.name == "Renamed" && fetched.summary.totalDice == 100 && fetched.summary.completedDice == 25 && fetched.document == document)
        guard case let .conflict(current) = try await repository.save(id, name: "Stale", document: document, expectedVersion: 1) else { Issue.record("stale save accepted"); return }
        #expect(current?.summary.cloudVersion == 2)
        guard case .conflict(nil) = try await repository.save(UUID(), name: "x", document: document, expectedVersion: 1) else { Issue.record("missing row not reported"); return }

        // rename helper
        guard case let .ok(v3) = try await repository.rename(id, name: "Renamed again", expectedVersion: 2) else { Issue.record("rename refused"); return }
        #expect(v3 == 3)

        // delete: row and objects go; deleting again is a no-op
        try await repository.delete(id)
        #expect(try await repository.get(id) == nil)
        // (a download would be answered from the URL cache; the folder listing is the truth)
        let folder = "\(userId.uuidString.lowercased())/\(id.uuidString.lowercased())"
        let remaining = try await SupabaseService.client.storage.from(ProjectPaths.bucket).list(path: folder)
        #expect(remaining.isEmpty)
        try await repository.delete(id)
    }

    private func syntheticJPEG() throws -> Data? {
        let ctx = CGContext(data: nil, width: 300, height: 300, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
        ctx?.setFillColor(CGColor(red: 0.2, green: 0.4, blue: 0.8, alpha: 1))
        ctx?.fill(CGRect(x: 0, y: 0, width: 300, height: 300))
        guard let image = ctx?.makeImage() else { return nil }
        return try ImageKit.encodeJPEG(image, quality: 0.9)
    }
}
