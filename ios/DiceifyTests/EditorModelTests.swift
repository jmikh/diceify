import CoreGraphics
import DiceCore
import Foundation
import Testing
@testable import Diceify

/// A saver that records calls and answers as told.
final class FakeSaver: ProjectSaving, @unchecked Sendable {
    var saves: [(name: String, document: ProjectDocument, expected: Int)] = []
    var previews: [String] = []
    var answer: (Int) -> ProjectRepository.SaveResult = { .ok(cloudVersion: $0 + 1) }
    var fail: Error?

    func save(_ id: UUID, name: String, document: ProjectDocument, expectedVersion: Int) async throws -> ProjectRepository.SaveResult {
        if let fail { throw fail }
        saves.append((name, document, expectedVersion))
        return answer(expectedVersion)
    }

    func uploadPreview(_ path: String, _ jpeg: Data) async throws { previews.append(path) }
}

@MainActor
private func makeModel(cloud: Bool, saver: FakeSaver = FakeSaver(), document: ProjectDocument = .createDefault()) throws -> (EditorModel, LocalStore) {
    let store = LocalStore(root: FileManager.default.temporaryDirectory.appendingPathComponent("editor-tests-\(UUID().uuidString)", isDirectory: true))
    // 120 × 90 gradient so a crop yields a real grid
    let ctx = CGContext(data: nil, width: 120, height: 90, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    for x in 0..<120 {
        ctx.setFillColor(CGColor(gray: Double(x) / 119, alpha: 1))
        ctx.fill(CGRect(x: x, y: 0, width: 1, height: 90))
    }
    let image = ctx.makeImage()!
    let jpeg = try ImageKit.encodeJPEG(image, quality: 0.95)
    let id = UUID()
    let entry = try store.create(id: id, name: "Test", image: jpeg, preview: nil, document: document, cloudVersion: cloud ? 1 : nil, imagePath: cloud ? "u/\(id)/original.jpg" : nil)
    let model = EditorModel(projectId: id, entry: entry, document: document, original: image, local: store, saver: saver, userId: cloud ? UUID() : nil)
    return (model, store)
}

private let crop = CropParams(x: 0, y: 0, width: 120, height: 90, rotation: 0, aspectRatio: .fourThree)

@MainActor
private func waitUntil(_ timeout: Duration = .seconds(5), _ condition: () -> Bool) async {
    let deadline = ContinuousClock.now + timeout
    while !condition() && ContinuousClock.now < deadline { try? await Task.sleep(for: .milliseconds(25)) }
}

@Suite(.serialized) @MainActor struct EditorModelTests {
    @Test func historyTracksCropAndDiceWithGestureBatching() throws {
        let (m, _) = try makeModel(cloud: false)
        #expect(!m.canUndo && !m.canRedo)
        m.setCrop(crop)
        m.updateDice { $0.contrast = 10 }
        #expect(m.canUndo)
        // a drag: many updates, one entry
        m.beginInteraction()
        for v in [11.0, 12, 13, 14] { m.updateDice { $0.contrast = v } }
        m.endInteraction()
        #expect(m.dice.contrast == 14)
        m.undo()
        #expect(m.dice.contrast == 10)
        m.undo()
        #expect(m.dice.contrast == DiceParams.default.contrast && m.crop == crop)
        m.undo()
        #expect(m.crop == nil && !m.canUndo && m.canRedo)
        m.redo(); m.redo(); m.redo()
        #expect(m.dice.contrast == 14 && !m.canRedo)
        // identical updates and untracked changes add nothing
        let depth = m.canUndo
        m.updateDice { $0.contrast = 14 }
        m.untracked { m.updateDice { $0.contrast = 15 } }
        #expect(m.canUndo == depth && m.dice.contrast == 15 && !m.canRedo)
    }

    @Test func pipelineGeneratesAndKeepsAStoredGrid() async throws {
        let (m, _) = try makeModel(cloud: false)
        m.setCrop(crop)
        await waitUntil { m.grid != nil && !m.isGenerating }
        let grid = try #require(m.grid)
        #expect(grid.height == DiceParams.default.numRows && grid.width == jsRoundInt(Double(DiceParams.default.numRows) * 120 / 90))
        #expect(m.preview != nil && m.thumbnail != nil && m.stats.totalCount == grid.width * grid.height)
        #expect(m.buildDocument().grid?.rows?.count == grid.height)
        // a param change drops the rows from the document until the pipeline catches up
        m.updateDice { $0.numRows = 30 }
        #expect(m.buildDocument().grid?.rows == nil)
        await waitUntil { m.grid?.height == 30 && !m.isGenerating }
        #expect(m.buildDocument().grid?.rows?.count == 30)

        // reopening with the stored grid: seeded at once, kept by the pipeline (no regeneration)
        let doc = m.buildDocument()
        let (reopened, _) = try makeModel(cloud: false, document: doc)
        #expect(reopened.grid == m.grid && reopened.stats == m.stats)
        await waitUntil { !reopened.isGenerating }
        #expect(reopened.grid == m.grid && reopened.preview != nil)
    }

    @Test func stepsAndResetConfirmation() async throws {
        let (m, _) = try makeModel(cloud: false)
        #expect(m.step == .crop && !m.canGoNext)
        m.go(to: .build)
        #expect(m.step == .crop) // no crop yet
        m.setCrop(crop)
        await waitUntil { m.grid != nil } // moving the selector needs a grid
        #expect(m.canGoNext)
        m.goNext()
        #expect(m.step == .tune)
        m.go(to: .build)
        #expect(m.step == .build && m.buildBaseline == GridInputs(crop: crop, dice: m.dice))
        m.goBack()
        #expect(m.step == .tune && m.pendingResetStep == nil)
        m.go(to: .build)
        m.setBuildProgressForTests(GridPos(x: 2, y: 0))
        m.go(to: .tune)
        #expect(m.step == .build && m.pendingResetStep == .tune)
        m.confirmPendingStep()
        #expect(m.step == .tune && m.pendingResetStep == nil)
        // params drift → re-entering build resets the progress
        m.updateDice { $0.contrast = 50 }
        #expect(m.buildDocument().buildProgress == .origin)
        m.go(to: .build)
        #expect(m.buildProgress == .origin)
    }

    @Test func buildNavigationHonoursTheRowLimit() async throws {
        let (m, _) = try makeModel(cloud: false)
        m.setCrop(crop)
        await waitUntil { m.grid != nil }
        m.go(to: .tune); m.go(to: .build)
        let width = m.grid!.width
        #expect(m.move(to: GridPos(x: 1, y: 0), rowLimit: 5) == .moved)
        #expect(m.move(to: GridPos(x: 0, y: 5), rowLimit: 5) == .blocked)
        #expect(m.move(to: GridPos(x: 0, y: 5), rowLimit: nil) == .moved)
        #expect(m.move(to: GridPos(x: 0, y: 1), rowLimit: 5) == .moved) // backwards is always fine
        #expect(m.move(to: GridPos(x: width, y: 1), rowLimit: nil) == .none)
        #expect(m.move(to: nil, rowLimit: nil) == .none)
        #expect(m.buildTargets.next == GridPos(x: 1, y: 1) && m.buildTargets.prev == GridPos(x: width - 1, y: 0))
        #expect(m.run != nil && m.currentDie != nil)
        #expect(abs(m.buildPercent - Double(buildIndex(m.buildProgress, width: width)) / Double(width * m.grid!.height) * 100) < 1e-9)
    }

    @Test func autosaveWritesTheFolderAndCasSavesTheCloud() async throws {
        let saver = FakeSaver()
        let (m, store) = try makeModel(cloud: true, saver: saver)
        m.setCrop(crop)
        #expect(m.saveStatus == .dirty)
        await m.flushSave()
        #expect(m.saveStatus == .saved && m.cloudVersion == 2 && saver.saves.count == 1 && saver.saves[0].expected == 1)
        #expect(try store.document(m.projectId).crop == crop && store.entry(m.projectId)?.meta.dirty == false)
        // nothing changed → nothing saved
        await m.flushSave()
        #expect(saver.saves.count == 1)
        // the name is part of the snapshot
        m.name = "Renamed"
        m.scheduleSave()
        await m.flushSave()
        #expect(saver.saves.count == 2 && saver.saves[1].name == "Renamed" && store.entry(m.projectId)?.meta.name == "Renamed")
        // the thumbnail reaches the folder and (debounced) the cloud
        await waitUntil { store.entry(m.projectId)?.hasPreview == true }
        await waitUntil(.seconds(4)) { !saver.previews.isEmpty }
        #expect(saver.previews == ["u/\(m.projectId)/preview.jpg"])
    }

    @Test func conflictReloadsTheCloudRow() async throws {
        let saver = FakeSaver()
        let (m, store) = try makeModel(cloud: true, saver: saver)
        var theirs = ProjectDocument.createDefault()
        theirs.step = .tune
        theirs.crop = CropParams(x: 10, y: 10, width: 60, height: 60, rotation: 0, aspectRatio: .square)
        let summary = ProjectSummary(id: m.projectId, name: "Theirs", totalDice: 0, completedDice: 0, percentComplete: 0, cloudVersion: 7, createdAt: Date(), updatedAt: Date(), imagePath: "u/x/original.jpg")
        saver.answer = { _ in .conflict(ProjectRecord(summary: summary, document: theirs)) }
        m.setCrop(crop)
        await m.flushSave()
        #expect(m.crop == theirs.crop && m.step == .tune && m.name == "Theirs" && m.cloudVersion == 7 && !m.canUndo)
        #expect(m.conflictNotice != nil && m.saveStatus == .saved)
        #expect(try store.document(m.projectId) == theirs)
        // deleted elsewhere: the project becomes local-only
        saver.answer = { _ in .conflict(nil) }
        m.updateDice { $0.contrast = 1 }
        await m.flushSave()
        #expect(m.cloudVersion == nil && store.entry(m.projectId)?.meta.cloudVersion == nil && m.saveStatus == .saved)
    }

    @Test func offlineKeepsTheFolderCurrentAndRetries() async throws {
        let saver = FakeSaver()
        saver.fail = URLError(.notConnectedToInternet)
        let (m, store) = try makeModel(cloud: true, saver: saver)
        m.setCrop(crop)
        await m.flushSave()
        let storedCrop = try store.document(m.projectId).crop
        #expect(m.saveStatus == .offline && storedCrop == crop && store.entry(m.projectId)?.meta.dirty == true)
        saver.fail = nil
        await m.flushSave()
        #expect(m.saveStatus == .saved && m.cloudVersion == 2)
    }

    @Test func cropHelpers() throws {
        let (m, _) = try makeModel(cloud: false)
        let initial = m.initialCrop()
        #expect(initial == CropParams(x: 15, y: 0, width: 90, height: 90, rotation: 0, aspectRatio: .square))
        m.setCrop(initial)
        m.setAspectRatio(.fourThree)
        #expect(m.crop?.aspectRatio == .fourThree && m.crop!.width / m.crop!.height == 4.0 / 3)
        m.setCrop(initial)
        m.rotate90()
        let rotated = try #require(m.crop)
        #expect(rotated.rotation == 90 && m.cropBounds == (90, 120))
        #expect(rotated.width == 90 && rotated.height == 90 && rotated.x == 0 && rotated.y == 15)
        m.rotate90(); m.rotate90(); m.rotate90()
        #expect(m.crop?.rotation == 0 && m.cropBounds == (120, 90))
    }
}

extension EditorModel {
    /// Tests only: set the build position (a forward move with no limit).
    func setBuildProgressForTests(_ pos: GridPos) { move(to: pos, rowLimit: nil) }
}
