import DiceCore
import SwiftUI
import UIKit

/// The build stage (BuilderMain + BuildViewer): the zoomable grid, the selector, the run badges, zoom buttons.
struct BuildView: View {
    @Bindable var model: EditorModel
    @Binding var prompt: GatePrompt?
    @Environment(AppSession.self) private var session
    @State private var zoomLevel: Double = BuildZoom.initial
    @State private var pinchStart: Double?

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if let grid = model.grid {
                BuildViewer(grid: grid, current: model.buildProgress, run: model.run, zoomLevel: zoomLevel) { target in
                    moveTo(target)
                }
                .gesture(
                    MagnifyGesture(minimumScaleDelta: 0.02)
                        .onChanged { value in
                            if pinchStart == nil { pinchStart = zoomLevel }
                            // pinching out shows fewer dice = zooming in; quantised like the buttons
                            zoomLevel = BuildZoom.clamp((pinchStart! / value.magnification / BuildZoom.step).rounded() * BuildZoom.step)
                        }
                        .onEnded { _ in pinchStart = nil }
                )
            } else {
                ProgressView()
            }
            VStack(spacing: 6) {
                zoomButton("plus", enabled: zoomLevel > BuildZoom.min) { zoomLevel = BuildZoom.clamp(zoomLevel - BuildZoom.step) }
                zoomButton("minus", enabled: zoomLevel < BuildZoom.max) { zoomLevel = BuildZoom.clamp(zoomLevel + BuildZoom.step) }
            }
            .padding(10)
        }
        .sensoryFeedback(.selection, trigger: model.buildProgress)
        .sensoryFeedback(.success, trigger: model.lastMilestones) { _, new in !new.isEmpty }
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true } // placing dice takes a while: keep the screen on
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
    }

    private func zoomButton(_ symbol: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol).font(.body.weight(.semibold)).foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(.ultraThinMaterial, in: Circle())
        }
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.35)
        .accessibilityLabel(symbol == "plus" ? "Zoom in" : "Zoom out")
    }

    func moveTo(_ target: GridPos?) {
        if model.move(to: target, rowLimit: session.entitlements.builderRowLimit) == .blocked {
            prompt = session.gate(false, .buildLimit, signInMessage: "Sign in to keep building past the free rows.", blocked: .limit)
        }
    }
}

enum BuildZoom {
    static let initial = 8.0, min = 4.0, max = 20.0, step = 2.0
    static func clamp(_ level: Double) -> Double { Swift.min(max, Swift.max(min, level)) }
}

/// The viewer around the DiceCore viewBox: the visible window of dice drawn with Core Graphics (one cached bitmap
/// per die), the run and selector boxes and the badges. Moves glide: the web transitions the highlights and the
/// viewBox over 0.5 s (`cubic-bezier(0.4, 0, 0.2, 1)`); here the whole frame (viewBox, selector, run) is one
/// animatable value, so boxes and dice stay aligned while they slide.
struct BuildViewer: View {
    let grid: DiceGrid
    let current: GridPos
    let run: (start: Int, end: Int)?
    let zoomLevel: Double
    let onTap: (GridPos) -> Void
    @State private var lastViewX: Double?

    static let glide = Animation.timingCurve(0.4, 0, 0.2, 1, duration: 0.5)

    var body: some View {
        GeometryReader { geo in
            let aspect = geo.size.width / max(1, geo.size.height)
            let view = computeViewBox(ViewBoxInput(current: current, cols: grid.width, rows: grid.height, zoomLevel: zoomLevel, aspect: aspect, lastViewX: lastViewX))
            let unit = geo.size.width / view.viewBox.w
            let svgY = Double(svgRow(current.y, height: grid.height))
            let frame = ViewerFrame(viewBoxX: view.viewBox.x, viewBoxY: view.viewBox.y, viewBoxW: view.viewBox.w, selX: Double(current.x), selY: svgY, runStart: Double(run?.start ?? current.x), runEnd: Double(run?.end ?? current.x))
            BuildCanvas(grid: grid, frame: frame, size: geo.size, badges: run.flatMap { $0.end > $0.start ? (width: $0.end - $0.start + 1, left: $0.end - current.x + 1) : nil }, belowDie: current.y >= grid.height - 2)
                .animation(Self.glide, value: frame)
                .onChange(of: view.lastViewX) { _, new in lastViewX = new }
                .onTapGesture { point in
                    let x = Int(floor(point.x / unit + view.viewBox.x))
                    let svgY = Int(floor(point.y / unit + view.viewBox.y))
                    guard x >= 0, x < grid.width, svgY >= 0, svgY < grid.height else { return }
                    onTap(GridPos(x: x, y: gridRowFromSvg(svgY, height: grid.height)))
                }
        }
        .clipped()
        .accessibilityLabel("Dice grid, row \(current.y + 1) column \(current.x + 1)")
    }
}

/// What a frame of the viewer shows, in viewBox units (1 = one die): interpolated by SwiftUI between moves.
struct ViewerFrame: VectorArithmetic, Equatable {
    var viewBoxX = 0.0, viewBoxY = 0.0, viewBoxW = 1.0
    var selX = 0.0, selY = 0.0
    var runStart = 0.0, runEnd = 0.0

    private var values: [Double] {
        get { [viewBoxX, viewBoxY, viewBoxW, selX, selY, runStart, runEnd] }
        set { (viewBoxX, viewBoxY, viewBoxW, selX, selY, runStart, runEnd) = (newValue[0], newValue[1], newValue[2], newValue[3], newValue[4], newValue[5], newValue[6]) }
    }

    static var zero: ViewerFrame { ViewerFrame(viewBoxW: 0) }
    static func + (a: ViewerFrame, b: ViewerFrame) -> ViewerFrame { var r = a; r.values = zip(a.values, b.values).map(+); return r }
    static func - (a: ViewerFrame, b: ViewerFrame) -> ViewerFrame { var r = a; r.values = zip(a.values, b.values).map(-); return r }
    mutating func scale(by rhs: Double) { values = values.map { $0 * rhs } }
    var magnitudeSquared: Double { values.reduce(0) { $0 + $1 * $1 } }
}

/// One frame of the viewer; `frame` is its animatable data, so a move redraws every step of the glide.
private struct BuildCanvas: View, @preconcurrency Animatable {
    let grid: DiceGrid
    var frame: ViewerFrame
    let size: CGSize
    /// Over a run of more than one die: purple = run width, pink = dice left in it.
    let badges: (width: Int, left: Int)?
    let belowDie: Bool

    var animatableData: ViewerFrame {
        get { frame }
        set { frame = newValue }
    }

    var body: some View {
        let unit = size.width / max(0.001, frame.viewBoxW)
        let viewBox = ViewBox(x: frame.viewBoxX, y: frame.viewBoxY, w: frame.viewBoxW, h: size.height / unit)
        let window = visibleWindow(viewBox, cols: grid.width, rows: grid.height)
        let toScreen = { (x: Double, svgY: Double) in CGPoint(x: (x - viewBox.x) * unit, y: (svgY - viewBox.y) * unit) }
        Canvas(rendersAsynchronously: false) { ctx, _ in
            ctx.fill(Path(CGRect(origin: .zero, size: size)), with: .color(.black))
            // die bitmaps in steps of 8 px so a zoom glide does not cache a size per frame
            let px = max(8, Int(ceil(unit / 8)) * 8)
            if window.x0 <= window.x1 && window.y0 <= window.y1 {
                for svgY in window.y0...window.y1 {
                    let y = gridRowFromSvg(svgY, height: grid.height)
                    for x in window.x0...window.x1 {
                        let origin = toScreen(Double(x), Double(svgY))
                        ctx.draw(Image(decorative: DiceRenderer.dieImage(grid.rows[y][x], size: px), scale: 1), in: CGRect(origin: origin, size: CGSize(width: unit, height: unit)))
                    }
                }
            }
            // The run of identical dice (blue fill, purple stroke), then the selector (pink)
            let runRect = CGRect(origin: toScreen(frame.runStart + 0.02, frame.selY + 0.02), size: CGSize(width: (frame.runEnd - frame.runStart + 1 - 0.04) * unit, height: 0.96 * unit))
            let runPath = Path(roundedRect: runRect, cornerRadius: 0.1 * unit)
            ctx.fill(runPath, with: .color(Color.accentBlue.opacity(0.1)))
            ctx.stroke(runPath, with: .color(.accentPurple), lineWidth: 0.06 * unit)
            let sel = Path(roundedRect: CGRect(origin: toScreen(frame.selX + 0.02, frame.selY + 0.02), size: CGSize(width: 0.96 * unit, height: 0.96 * unit)), cornerRadius: 0.1 * unit)
            ctx.fill(sel, with: .color(Color.brandPink.opacity(0.2)))
            ctx.stroke(sel, with: .color(.brandPink), lineWidth: 0.06 * unit)
            if let badges {
                let badgeY = frame.selY + (belowDie ? 1.3 : -0.32)
                let flip: Double = belowDie ? -1 : 1
                drawBadge(&ctx, at: toScreen(frame.runStart + 0.5, badgeY), radius: 0.20 * unit, stick: (0.20 * flip, 0.35 * flip), unit: unit, color: .accentPurple, label: "×\(badges.width)")
                drawBadge(&ctx, at: toScreen(frame.selX + 0.5, badgeY), radius: 0.22 * unit, stick: (0.22 * flip, 0.35 * flip), unit: unit, color: .brandPink, label: "×\(badges.left)")
            }
        }
    }

    private func drawBadge(_ ctx: inout GraphicsContext, at p: CGPoint, radius: Double, stick: (Double, Double), unit: Double, color: Color, label: String) {
        var line = Path()
        line.move(to: CGPoint(x: p.x, y: p.y + stick.0 * unit))
        line.addLine(to: CGPoint(x: p.x, y: p.y + stick.1 * unit))
        ctx.stroke(line, with: .color(color), lineWidth: 0.1 * unit)
        ctx.fill(Path(ellipseIn: CGRect(x: p.x - radius, y: p.y - radius, width: 2 * radius, height: 2 * radius)), with: .color(color.opacity(0.9)))
        ctx.draw(Text(label).font(.system(size: 0.16 * unit, weight: .semibold)).foregroundStyle(.white), at: p)
    }
}

/// Build controls (MobileBuildControls): progress · more, above the navigation around the row/col readout.
struct BuildControls: View {
    @Bindable var model: EditorModel
    @Binding var prompt: GatePrompt?
    @Environment(AppSession.self) private var session
    @Environment(\.openURL) private var openURL
    @State private var progressOpen = false
    @State private var blueprintURL: URL?

    private static let purchaseDiceURL = URL(string: "https://www.amazon.com/s?k=black+and+white+bulk+dice")!

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                ProgressView(value: model.buildPercent, total: 100).tint(.brandPink)
                Text(model.buildPercent >= 100 ? "Done" : String(format: "%.1f%%", model.buildPercent))
                    .font(.system(size: 13)).foregroundStyle(Color.textSecondary).monospacedDigit()
                Menu {
                    Button { progressOpen = true } label: { Label("View progress", systemImage: "eye") }
                    Button { exportBlueprint() } label: { Label("Download blueprint", systemImage: "square.and.arrow.down") }
                    Button { openURL(Self.purchaseDiceURL) } label: { Label("Purchase dice", systemImage: "cart") }
                } label: {
                    Image(systemName: "ellipsis").font(.body.weight(.semibold)).foregroundStyle(.white)
                        .frame(width: 40, height: 40)
                        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
                }
                .accessibilityLabel("More: progress, blueprint, purchase dice")
            }
            .padding(.horizontal, 6)
            .frame(height: EditorLayout.mainRow - 16)
            HStack(spacing: 8) {
                navButton("chevron.left.2", target: model.buildTargets.prevDiff, label: "Previous different die")
                navButton("chevron.left", target: model.buildTargets.prev, label: "Previous die")
                HStack(spacing: 0) {
                    position("ROW", model.buildProgress.y + 1)
                    Divider().background(Color.white.opacity(0.08))
                    position("COL", model.buildProgress.x + 1)
                }
                .frame(maxHeight: .infinity)
                .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
                navButton("chevron.right", target: model.buildTargets.next, label: "Next die")
                navButton("chevron.right.2", target: model.buildTargets.nextDiff, label: "Next different die", primary: true)
            }
            .frame(height: EditorLayout.toolRow)
        }
        .sheet(isPresented: $progressOpen) { ProgressPreviewSheet(model: model) }
        .sheet(item: $blueprintURL) { url in ActivityView(items: [url]) }
    }

    private func navButton(_ symbol: String, target: GridPos?, label: String, primary: Bool = false) -> some View {
        Button {
            if model.move(to: target, rowLimit: session.entitlements.builderRowLimit) == .blocked {
                prompt = session.gate(false, .buildLimit, signInMessage: "Sign in to keep building past the free rows.", blocked: .limit)
            }
        } label: {
            Image(systemName: symbol).font(.title3.weight(.semibold))
        }
        .buttonStyle(RowButtonStyle(primary: primary))
        .disabled(target == nil)
        .accessibilityLabel(label)
    }

    private func position(_ label: String, _ value: Int) -> some View {
        VStack(spacing: 0) {
            Text(label).font(.system(size: 10, weight: .semibold)).tracking(1.2).foregroundStyle(Color.textMuted)
            Text("\(value)").font(.display(18)).foregroundStyle(.white).monospacedDigit()
        }
        .frame(minWidth: 56)
    }

    /// The whole grid as an SVG file through the share sheet (the `hasSvgExport` entitlement).
    private func exportBlueprint() {
        if let p = session.gate(session.entitlements.hasSvgExport, .blueprint, signInMessage: "Sign in to download the blueprint.") {
            prompt = p
            return
        }
        guard let grid = model.grid else { return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("dice-art-\(Int(Date().timeIntervalSince1970)).svg")
        do {
            try renderGridSvg(grid).write(to: url, atomically: true, encoding: .utf8)
            blueprintURL = url
            Analytics.track(.blueprintDownloaded(totalDice: grid.width * grid.height))
        } catch {
            model.conflictNotice = "The blueprint could not be written."
        }
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}

/// The system share sheet.
struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: items, applicationActivities: nil) }
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

/// Progress preview (ProgressPreviewModal): placed dice solid, the rest ghosted; "Full" shows the finished art.
struct ProgressPreviewSheet: View {
    @Bindable var model: EditorModel
    @State private var showAll = false
    @State private var image: CGImage?

    var body: some View {
        VStack(spacing: 16) {
            Capsule().fill(Color.white.opacity(0.2)).frame(width: 36, height: 5).padding(.top, 8)
            Picker("View", selection: $showAll) {
                Text("Progress").tag(false)
                Text("Full").tag(true)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 24)
            if let image {
                Image(decorative: image, scale: 1).resizable().interpolation(.high).scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Color.brandPink, lineWidth: 2))
                    .padding(.horizontal, 16)
            } else {
                ProgressView().frame(maxHeight: .infinity)
            }
            Spacer(minLength: 0)
        }
        .padding(.bottom, 16)
        .presentationBackground(Color.bgSecondary)
        .task(id: showAll) { render() }
    }

    private func render() {
        guard let grid = model.grid else { return }
        let longSide = min(max(grid.width, grid.height) * 10, 1080)
        image = DiceRenderer.renderProgress(grid, progress: model.buildProgress, showAll: showAll, size: rasterSize(cols: grid.width, rows: grid.height, longSide: longSide))
    }
}
