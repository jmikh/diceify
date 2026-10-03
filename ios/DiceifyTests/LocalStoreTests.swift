import DiceCore
import Foundation
import Testing
@testable import Diceify

@Suite struct LocalStoreTests {
    private func tempStore() -> LocalStore {
        LocalStore(root: FileManager.default.temporaryDirectory.appendingPathComponent("diceify-tests-\(UUID().uuidString)", isDirectory: true))
    }

    @Test func createListDocumentRenameDelete() throws {
        let store = tempStore()
        #expect(store.list().isEmpty)
        let image = Data([0xFF, 0xD8, 0xFF, 0xD9])
        let a = try store.create(name: "A", image: image, preview: Data([1, 2, 3]))
        #expect(a.meta.cloudVersion == nil && a.meta.dirty && a.meta.totalDice == 0 && a.hasPreview)
        #expect(try store.image(a.id) == image)
        #expect(try store.document(a.id) == ProjectDocument.createDefault())

        var doc = ProjectDocument.createDefault()
        doc.step = .build
        doc.grid = StoredGrid(width: 10, height: 10, rows: nil)
        doc.buildProgress = GridPos(x: 5, y: 2)
        try store.writeDocument(a.id, doc, dirty: true)
        let reloaded = try #require(store.entry(a.id))
        #expect(reloaded.meta.totalDice == 100 && reloaded.meta.completedDice == 25 && reloaded.meta.dirty)
        #expect(try store.document(a.id) == doc)

        try store.update(a.id) { $0.name = "Renamed"; $0.cloudVersion = 3; $0.dirty = false }
        #expect(store.entry(a.id)?.meta == LocalStore.Meta(name: "Renamed", cloudVersion: 3, imagePath: nil, updatedAt: reloaded.meta.updatedAt, totalDice: 100, completedDice: 25, dirty: false))

        let b = try store.create(name: "B", image: image, preview: nil, cloudVersion: 1, imagePath: "u/p/original.jpg")
        #expect(!b.hasPreview && !b.meta.dirty)
        #expect(store.list().map(\.id) == [b.id, a.id]) // newest first
        try store.delete(a.id)
        #expect(store.entry(a.id) == nil && store.list().map(\.id) == [b.id])
        try store.delete(a.id) // already gone: no-op
    }

    @Test func documentIsStrictOnRead() throws {
        let store = tempStore()
        let entry = try store.create(name: "x", image: Data([1]), preview: nil)
        try Data("{\"schemaVersion\":9}".utf8).write(to: entry.documentURL)
        #expect(throws: DocumentError.self) { try store.document(entry.id) }
    }
}
