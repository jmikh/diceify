import CoreGraphics
import DiceCore
import Foundation
import Observation
import os

private let log = Logger(subsystem: "art.diceify.app", category: "editor")

/// One open project in the editor (features/editor/store: useDocumentStore + useDerivedStore + autosave + the
/// navigation hooks, folded into one observable object):
///   - the document (crop, tune params, build progress, baseline) with undo/redo over crop + dice only, slider
///     drags batched into one entry;
///   - the derivation pipeline: crop → pixels + thumbnail → grid (kept while the inputs match) → preview raster;
///   - autosave: the whole snapshot, 1.5 s after the last change, to the local folder and (signed in, cloud
///     project) with a compare-and-set on `cloud_version`; a conflict reloads the cloud row.
///   - step and build navigation rules (Steps, DiceCore build math).
@MainActor
@Observable
final class EditorModel {
    enum SaveStatus: Equatable { case idle, dirty, saving, saved, error, offline }
    enum MoveResult { case moved, blocked, none }

    // MARK: Identity

    let projectId: UUID
    let local: LocalStore
    let saver: any ProjectSaving
    let original: CGImage
    private(set) var cloudVersion: Int?
    private(set) var imagePath: String?
    /// The signed-in user (nil = cloud saves are skipped; the folder keeps the work).
    var userId: UUID?

    // MARK: Document

    var name: String
    private(set) var step: DocumentStep
    private(set) var crop: CropParams?
    private(set) var dice: DiceParams
    private(set) var buildProgress: GridPos
    private(set) var buildBaseline: BuildBaseline?

    // MARK: Derived (the pipeline's output)

    private(set) var grid: DiceGrid?
    private(set) var gridRows: [String]?
    private(set) var gridInputs: GridInputs?
    private(set) var stats: DiceStats = .empty
    private(set) var preview: CGImage?
    private(set) var thumbnail: Data?
    private(set) var isGenerating = false
    private(set) var generationError: String?

    // MARK: Save state

    private(set) var saveStatus: SaveStatus = .idle
    private(set) var lastSaved: Date?
    /// Set when the cloud row changed elsewhere and was reloaded (the view shows it once).
    var conflictNotice: String?
    /// A step change that needs the "reset progress?" confirmation first.
    var pendingResetStep: DocumentStep?

    // MARK: History

    private struct Entry: Equatable { let crop: CropParams?; let dice: DiceParams }
    private var past: [Entry] = []
    private var future: [Entry] = []
    private var interactionDepth = 0
    private var latched = false
    private var tracking = true
    private let historyLimit = 50

    var canUndo: Bool { !past.isEmpty }
    var canRedo: Bool { !future.isEmpty }

    // MARK: Internals

    private var pipelineTask: Task<Void, Never>?
    private var cropCache: (crop: CropParams, pixels: Pixels, thumbnail: Data)?
    private var saveTask: Task<Void, Never>?
    private var saveInFlight = false
    private var saveQueued = false
    private var lastSavedJSON: Data?
    private var previewTask: Task<Void, Never>?
    private var lastUploadedThumbnail: Data?
    static let generationDebounce: Duration = .milliseconds(300)
    static let saveDebounce: Duration = .milliseconds(1500)
    static let previewLongSide = 1080

    init(projectId: UUID, entry: LocalStore.Entry, document: ProjectDocument, original: CGImage, local: LocalStore, saver: any ProjectSaving, userId: UUID?) {
        self.projectId = projectId
        self.local = local
        self.saver = saver
        self.original = original
        self.userId = userId
        self.cloudVersion = entry.meta.cloudVersion
        self.imagePath = entry.meta.imagePath
        self.name = entry.meta.name
        self.step = document.step
        self.crop = document.crop
        self.dice = document.dice
        self.buildProgress = document.buildProgress
        self.buildBaseline = GridInputs(crop: document.crop, dice: document.dice)
        self.saveStatus = entry.meta.dirty ? .dirty : .idle
        self.lastSaved = entry.meta.dirty ? nil : entry.meta.updatedAt
        seedGrid(from: document)
        lastSavedJSON = try? buildDocument().jsonData()
        scheduleGeneration()
    }

    /// Open the project folder (cached by `ProjectsStore.cache`) into a model.
    static func open(projectId: UUID, local: LocalStore, saver: any ProjectSaving, userId: UUID?) throws -> EditorModel {
        guard let entry = local.entry(projectId) else { throw CocoaError(.fileNoSuchFile) }
        let document = try local.document(projectId)
        let original = try ImageKit.decodeOriginal(try local.image(projectId))
        return EditorModel(projectId: projectId, entry: entry, document: document, original: original, local: local, saver: saver, userId: userId)
    }

    // MARK: Document snapshot

    /// The grid to persist: the derived grid's size, with its dice only while they were generated from the current
    /// crop/tune params (`buildDocument` on the web).
    private func storedGrid() -> StoredGrid? {
        guard let grid else { return nil }
        let current = gridRows != nil && gridInputsEqual(GridInputs(crop: crop, dice: dice), gridInputs)
        return StoredGrid(width: grid.width, height: grid.height, rows: current ? gridRows : nil)
    }

    func buildDocument() -> ProjectDocument {
        ProjectDocument(
            step: step,
            crop: crop,
            dice: dice,
            grid: storedGrid(),
            buildProgress: progressApplies(GridInputs(crop: crop, dice: dice), baseline: buildBaseline) ? buildProgress : .origin
        )
    }

    private func seedGrid(from document: ProjectDocument) {
        guard let stored = document.grid else { return }
        if let decoded = try? decodeStoredGrid(stored) {
            grid = decoded
            gridRows = stored.rows
            gridInputs = GridInputs(crop: document.crop, dice: document.dice)
            stats = computeStats(decoded)
        } else {
            stats = DiceStats(blackCount: 0, whiteCount: 0, totalCount: stored.width * stored.height)
        }
    }

    // MARK: Mutations (crop + dice are undoable)

    private func record() {
        guard tracking else { return }
        if interactionDepth > 0 {
            if latched { return }
            latched = true
        }
        past.append(Entry(crop: crop, dice: dice))
        if past.count > historyLimit { past.removeFirst(past.count - historyLimit) }
        future.removeAll()
    }

    /// A continuous gesture (slider drag, crop drag) records one undo entry.
    func beginInteraction() {
        if interactionDepth == 0 { latched = false }
        interactionDepth += 1
    }

    func endInteraction() {
        interactionDepth = max(0, interactionDepth - 1)
        if interactionDepth == 0 { latched = false }
    }

    /// Run a change that never records history (widget corrections).
    func untracked(_ change: () -> Void) {
        let was = tracking
        tracking = false
        change()
        tracking = was
    }

    func setCrop(_ next: CropParams?) {
        guard !(crop == nil && next == nil), !(crop != nil && next != nil && crop == next) else { return }
        record()
        crop = next
        changed()
    }

    func updateDice(_ change: (inout DiceParams) -> Void) {
        var next = dice
        change(&next)
        guard next != dice else { return }
        record()
        dice = next
        changed()
    }

    func undo() {
        guard let entry = past.popLast() else { return }
        future.append(Entry(crop: crop, dice: dice))
        crop = entry.crop
        dice = entry.dice
        changed()
    }

    func redo() {
        guard let entry = future.popLast() else { return }
        past.append(Entry(crop: crop, dice: dice))
        crop = entry.crop
        dice = entry.dice
        changed()
    }

    private func changed() {
        scheduleGeneration()
        scheduleSave()
    }

    // MARK: Steps

    func canGo(to target: DocumentStep) -> Bool { Steps.canEnter(target, hasCrop: crop != nil) }
    var canGoNext: Bool { Steps.next(step).map { _ in Steps.canAdvance(step, hasCrop: crop != nil) } ?? false }
    var canGoBack: Bool { Steps.prev(step) != nil }

    /// The one way to move between steps: entering build re-anchors progress; leaving build with progress asks first.
    func go(to target: DocumentStep) {
        guard target != step, canGo(to: target) else { return }
        if Steps.needsResetConfirm(from: step, to: target, progress: buildProgress) {
            pendingResetStep = target
            return
        }
        apply(step: target)
    }

    func goNext() { if let next = Steps.next(step), canGoNext { go(to: next) } }
    func goBack() { if let prev = Steps.prev(step) { go(to: prev) } }

    /// The user confirmed leaving build (progress may be reset when the params change afterwards).
    func confirmPendingStep() {
        guard let target = pendingResetStep else { return }
        pendingResetStep = nil
        apply(step: target)
    }

    private func apply(step target: DocumentStep) {
        if target == .build { enterBuild() }
        step = target
        scheduleSave()
    }

    /// Keep progress only if it still applies, re-anchor the baseline (`enterBuild` on the web).
    private func enterBuild() {
        let inputs = GridInputs(crop: crop, dice: dice)
        if !progressApplies(inputs, baseline: buildBaseline) { buildProgress = .origin }
        buildBaseline = inputs
    }

    // MARK: Build navigation (features/editor/store/buildNavigation.ts)

    struct Targets { var prev, next, prevDiff, nextDiff: GridPos? }

    var buildTargets: Targets {
        guard let grid, buildProgress.y < grid.height, buildProgress.x < grid.width else { return Targets() }
        let row = grid.rows[buildProgress.y]
        let prevX = findPrevDiff(row, x: buildProgress.x)
        let nextX = findNextDiff(row, x: buildProgress.x)
        return Targets(
            prev: prevPosition(buildProgress, width: grid.width),
            next: nextPosition(buildProgress, width: grid.width, height: grid.height),
            prevDiff: prevX.map { GridPos(x: $0, y: buildProgress.y) } ?? (buildProgress.y > 0 ? GridPos(x: grid.width - 1, y: buildProgress.y - 1) : nil),
            nextDiff: nextX.map { GridPos(x: $0, y: buildProgress.y) } ?? (buildProgress.y < grid.height - 1 ? GridPos(x: 0, y: buildProgress.y + 1) : nil)
        )
    }

    /// The run of identical dice the selector is in.
    var run: (start: Int, end: Int)? {
        guard let grid, buildProgress.y < grid.height, buildProgress.x < grid.width else { return nil }
        return findRun(grid.rows[buildProgress.y], x: buildProgress.x)
    }

    var currentDie: Die? {
        guard let grid, buildProgress.y < grid.height, buildProgress.x < grid.width else { return nil }
        return grid.rows[buildProgress.y][buildProgress.x]
    }

    var buildPercent: Double {
        guard let grid else { return 0 }
        let total = grid.width * grid.height
        return total > 0 ? Double(buildIndex(buildProgress, width: grid.width)) / Double(total) * 100 : 0
    }

    /// Milestones (25/50/75/100) crossed by the last forward move, for analytics and haptics.
    private(set) var lastMilestones: [Int] = []

    /// Move the selector. Backward moves are always allowed; a forward move past `rowLimit` is blocked (nil = unlimited).
    @discardableResult
    func move(to target: GridPos?, rowLimit: Int?) -> MoveResult {
        guard let target, let grid, target.x >= 0, target.x < grid.width, target.y >= 0, target.y < grid.height else { return .none }
        let forward = buildIndex(target, width: grid.width) > buildIndex(buildProgress, width: grid.width)
        if forward && !rowLimitAllows(target, rowLimit: rowLimit) { return .blocked }
        guard target != buildProgress else { return .none }
        lastMilestones = forward ? buildMilestonesCrossed(from: buildIndex(buildProgress, width: grid.width), to: buildIndex(target, width: grid.width), total: grid.width * grid.height) : []
        buildProgress = target
        scheduleSave()
        return .moved
    }

    // MARK: Pipeline

    func scheduleGeneration() {
        pipelineTask?.cancel()
        guard let crop else {
            pipelineTask = nil
            return
        }
        isGenerating = true
        generationError = nil
        let dice = self.dice
        let original = self.original
        let inputs = GridInputs(crop: crop, dice: dice)
        let cached = cropCache.flatMap { $0.crop == crop ? $0 : nil }
        let held = (grid, gridInputs)
        pipelineTask = Task { [weak self] in
            do {
                try await Task.sleep(for: Self.generationDebounce)
                // A: the cropped pixels and the thumbnail (cached per crop: slider drags reuse them)
                let stageA: (pixels: Pixels, thumbnail: Data) = try await Task.detached(priority: .userInitiated) {
                    if let cached { return (cached.pixels, cached.thumbnail) }
                    return (try ImageKit.cropPixels(original, crop: crop), try ImageKit.thumbnail(original, crop: crop))
                }.value
                try Task.checkCancellation()
                // B: the grid, kept when it was generated from exactly these inputs (a loaded document's stored grid)
                let grid: DiceGrid
                if let heldGrid = held.0, gridInputsEqual(inputs, held.1) {
                    grid = heldGrid
                } else {
                    grid = await Task.detached(priority: .userInitiated) { generateDiceGrid(stageA.pixels, params: dice) }.value
                }
                try Task.checkCancellation()
                // C: the preview raster
                let size = rasterSize(cols: grid.width, rows: grid.height, longSide: Self.previewLongSide)
                let preview = await Task.detached(priority: .userInitiated) { DiceRenderer.render(grid, size: size) }.value
                try Task.checkCancellation()
                guard let self else { return }
                self.cropCache = (crop, stageA.pixels, stageA.thumbnail)
                self.thumbnail = stageA.thumbnail
                if self.grid != grid || self.gridInputs != inputs {
                    self.grid = grid
                    self.gridRows = encodeGrid(grid)
                    self.gridInputs = inputs
                    self.stats = computeStats(grid)
                    self.scheduleSave() // the rows are part of the document
                }
                self.preview = preview
                self.isGenerating = false
                self.schedulePreviewSync()
            } catch is CancellationError {
            } catch {
                guard let self else { return }
                log.error("pipeline failed: \(String(describing: error), privacy: .public)")
                self.generationError = "Could not generate the dice."
                self.isGenerating = false
            }
        }
    }

    // MARK: Autosave

    private var signedInCloudProject: Bool { userId != nil && cloudVersion != nil && imagePath != nil }

    func scheduleSave() {
        guard let json = try? buildDocument().jsonData() else { return }
        let changed = json != lastSavedJSON || name != local.entry(projectId)?.meta.name
        guard changed else { return }
        if saveStatus != .saving { saveStatus = .dirty }
        saveTask?.cancel()
        saveTask = Task { [weak self] in
            try? await Task.sleep(for: Self.saveDebounce)
            guard !Task.isCancelled else { return }
            await self?.persist()
        }
    }

    /// Save now if anything changed (step change, backgrounding, leaving the editor). Serialised.
    func flushSave() async {
        saveTask?.cancel()
        await persist()
    }

    private func persist() async {
        if saveInFlight {
            saveQueued = true
            return
        }
        saveInFlight = true
        defer {
            saveInFlight = false
            if saveQueued {
                saveQueued = false
                Task { await self.persist() }
            }
        }
        let document = buildDocument()
        guard let json = try? document.jsonData() else { return }
        let nameChanged = name != local.entry(projectId)?.meta.name
        guard json != lastSavedJSON || nameChanged else {
            if saveStatus == .dirty { saveStatus = .idle }
            return
        }
        // The folder first: it is the source the app reopens from, online or not
        do {
            try local.writeDocument(projectId, document, dirty: cloudVersion != nil)
            try local.update(projectId) { $0.name = self.name }
        } catch {
            log.error("local save failed: \(String(describing: error), privacy: .public)")
            saveStatus = .error
            return
        }
        guard signedInCloudProject, let version = cloudVersion else {
            lastSavedJSON = json
            lastSaved = Date()
            saveStatus = .saved
            return
        }
        saveStatus = .saving
        do {
            switch try await saver.save(projectId, name: name, document: document, expectedVersion: version) {
            case let .ok(newVersion):
                cloudVersion = newVersion
                try? local.update(projectId) { $0.cloudVersion = newVersion; $0.dirty = false }
                lastSavedJSON = json
                lastSaved = Date()
                saveStatus = .saved
            case let .conflict(current):
                if let current {
                    replace(with: current)
                    conflictNotice = "This project was changed elsewhere. Reloaded the latest version."
                } else {
                    // Deleted elsewhere: the folder keeps the work as a local-only project
                    cloudVersion = nil
                    imagePath = nil
                    try? local.update(projectId) { $0.cloudVersion = nil; $0.imagePath = nil; $0.dirty = false }
                    conflictNotice = "This project was deleted elsewhere. Your work is kept on this phone."
                    lastSavedJSON = json
                    saveStatus = .saved
                }
            }
        } catch {
            log.error("cloud save failed: \(String(describing: error), privacy: .public)")
            saveStatus = (error as? URLError) != nil ? .offline : .error
            // lastSavedJSON unchanged: the next change or flush retries; the folder is already current
        }
    }

    /// The cloud row wins: load it (no history), re-anchor, and regenerate.
    private func replace(with record: ProjectRecord) {
        let doc = record.document
        name = record.summary.name
        cloudVersion = record.summary.cloudVersion
        step = doc.step
        crop = doc.crop
        dice = doc.dice
        buildProgress = doc.buildProgress
        buildBaseline = GridInputs(crop: doc.crop, dice: doc.dice)
        past.removeAll()
        future.removeAll()
        grid = nil
        gridRows = nil
        gridInputs = nil
        seedGrid(from: doc)
        try? local.writeDocument(projectId, doc, dirty: false)
        try? local.update(projectId) { $0.name = record.summary.name; $0.cloudVersion = record.summary.cloudVersion }
        lastSavedJSON = try? doc.jsonData()
        lastSaved = record.summary.updatedAt
        saveStatus = .saved
        scheduleGeneration()
    }

    /// The thumbnail follows the crop: the folder's preview.jpg, and the cloud's (debounced, once per distinct image).
    private func schedulePreviewSync() {
        guard let thumbnail, thumbnail != lastUploadedThumbnail else { return }
        try? local.writePreview(projectId, thumbnail)
        previewTask?.cancel()
        guard signedInCloudProject, let imagePath else { return }
        previewTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(2))
            guard !Task.isCancelled, let self else { return }
            do {
                try await self.saver.uploadPreview(ProjectPaths.preview(for: imagePath), thumbnail)
                self.lastUploadedThumbnail = thumbnail
            } catch {
                log.error("preview upload failed: \(String(describing: error), privacy: .public)")
            }
        }
    }

    // MARK: Crop helpers for the crop view

    /// The rotated image's size (the space crop coordinates live in).
    var cropBounds: (width: Int, height: Int) {
        ImageKit.rotatedBounds(width: original.width, height: original.height, rotation: crop?.rotation ?? 0)
    }

    func setAspectRatio(_ aspect: AspectRatio) {
        guard let crop else { return }
        let bounds = cropBounds
        setCrop(reframeCrop(crop, aspectRatio: aspect, bounds: (Double(bounds.width), Double(bounds.height))))
    }

    /// Rotate the image 90° clockwise under the crop: the crop box turns with the image around the centre, then the
    /// box is kept inside the new bounds (the web widget's `rotateImage`).
    func rotate90() {
        guard let crop else { return }
        let old = cropBounds
        let cx = crop.x + crop.width / 2 - Double(old.width) / 2
        let cy = crop.y + crop.height / 2 - Double(old.height) / 2
        // clockwise 90°: (x, y) → (-y, x)
        let ncx = -cy + Double(old.height) / 2
        let ncy = cx + Double(old.width) / 2
        let newBounds = (width: old.height, height: old.width)
        let w = min(crop.width, Double(newBounds.width)), h = min(crop.height, Double(newBounds.height))
        let clamp = { (v: Double, max: Double) in Swift.min(Swift.max(v, 0), max) }
        setCrop(CropParams(x: clamp(ncx - w / 2, Double(newBounds.width) - w), y: clamp(ncy - h / 2, Double(newBounds.height) - h), width: w, height: h, rotation: (crop.rotation + 90).truncatingRemainder(dividingBy: 360), aspectRatio: crop.aspectRatio))
    }

    /// The largest centred box of the default preset: the crop a fresh project starts with.
    func initialCrop(aspect: AspectRatio = DEFAULT_ASPECT_RATIO) -> CropParams {
        let w = Double(original.width), h = Double(original.height)
        let ratio = aspect.ratio
        let (bw, bh) = w / h > ratio ? (h * ratio, h) : (w, w / ratio)
        return CropParams(x: (w - bw) / 2, y: (h - bh) / 2, width: bw, height: bh, rotation: 0, aspectRatio: aspect)
    }
}
