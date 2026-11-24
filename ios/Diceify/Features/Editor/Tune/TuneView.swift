import DiceCore
import SwiftUI

/// The tune stage (TunerMain + DiceStatsInline): the rendered grid with the dice counts on a floating pill; the
/// design paywall's watermark and "Remove watermark" while the design uses settings the plan lacks (DesignPaywall);
/// hold the eye button to see the cropped photo in the dice's place (HoldOriginal).
struct TuneView: View {
    @Bindable var model: EditorModel
    @Binding var prompt: GatePrompt?
    @Environment(AppSession.self) private var session
    @State private var photo: CGImage?
    @State private var holding = false

    /// Long side of the cropped photo: sharp on a retina screen.
    private static let photoLongSide = 1600

    var body: some View {
        let locked = model.preview != nil && !session.designLocks(for: model.dice).isEmpty
        ZStack(alignment: .bottom) {
            Color.bgDeep
            Group {
                if let preview = model.preview {
                    ZStack {
                        Image(decorative: preview, scale: 1)
                            .resizable()
                            .interpolation(.high)
                            .scaledToFit()
                            .opacity(model.isGenerating ? 0.6 : 1)
                            .animation(.easeOut(duration: 0.2), value: model.isGenerating)
                        if locked, let grid = model.expectedGridSize {
                            Watermark(grid: (grid.width, grid.height))
                        }
                        if holding, let photo {
                            Image(decorative: photo, scale: 1)
                                .resizable()
                                .interpolation(.high)
                                .scaledToFit()
                                .accessibilityLabel("Original photo")
                        }
                    }
                } else if let error = model.generationError {
                    Text(error).foregroundStyle(.red)
                } else {
                    ProgressView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // The dice counts as a floating pill over the preview
            HStack(spacing: 18) {
                count(model.stats.blackCount, "black", swatch: .black)
                count(model.stats.whiteCount, "white", swatch: .white)
            }
            .font(.footnote.weight(.semibold))
            .monospacedDigit()
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .glassPill()
            .padding(.bottom, 12)
            .accessibilityElement(children: .combine)
        }
        .overlay(alignment: .top) {
            if locked {
                Button { prompt = session.upgradePrompt(source: "design_paywall") } label: {
                    Label("Remove watermark", systemImage: "lock")
                        .font(.footnote.weight(.medium))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                }
                .glassButton()
                .padding(.top, 12)
            }
        }
        .overlay(alignment: .bottomTrailing) {
            if model.preview != nil {
                // Hold to compare: the cropped photo covers the dice while the finger is down
                Button {} label: { Image(systemName: "eye") }
                    .buttonStyle(.stage)
                    .disabled(photo == nil)
                    .opacity(photo == nil ? 0.35 : 1)
                    .simultaneousGesture(DragGesture(minimumDistance: 0).onChanged { _ in holding = true }.onEnded { _ in holding = false })
                    .accessibilityLabel("Hold to see original")
                    .padding(12)
            }
        }
        .task(id: model.crop) {
            photo = nil
            guard let crop = model.crop else { return }
            let original = model.original
            let longSide = Self.photoLongSide
            photo = await Task.detached(priority: .userInitiated) { try? ImageKit.drawRegion(original, crop: crop, maxSide: longSide).makeImage() }.value
        }
    }

    private func count(_ n: Int, _ label: String, swatch: Color) -> some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 3).fill(swatch).frame(width: 12, height: 12)
                .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.white.opacity(0.4), lineWidth: 0.5))
            Text(formatDiceCount(n)).foregroundStyle(.white) + Text(" \(label)").foregroundStyle(Color.textSecondary)
        }
    }
}

/// Tune controls (MobileTuneControls): one control at a time in the main row (between step back / next) above a
/// segmented row of tools. Settings the plan lacks carry a PRO tag (the design paywall).
struct TuneControls: View {
    @Bindable var model: EditorModel
    @Environment(AppSession.self) private var session
    @State private var active: Tool = .rows

    enum Tool: String, CaseIterable {
        case rows, contrast, brightness, sharpening, color, rotate

        var label: String {
            switch self {
            case .rows: "Rows"
            case .contrast: "Contrast"
            case .brightness: "Brightness"
            case .sharpening: "Sharpening"
            case .color: "Color"
            case .rotate: "Rotate"
            }
        }

        var symbol: String {
            switch self {
            case .rows: "square.grid.3x3"
            case .contrast: "circle.lefthalf.filled"
            case .brightness: "sun.max"
            case .sharpening: "sparkles"
            case .color: "circle.righthalf.filled"
            case .rotate: "rotate.right"
            }
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            StepRow(model: model) {
                Group {
                    switch active {
                    case .rows: slider(value: Binding(get: { Double(model.dice.numRows) }, set: { v in model.updateDice { $0.numRows = Int(v.rounded()) } }), range: 20...120, step: 1, badge: rowsBadge) { _ in gridSize }
                    case .contrast: slider(value: Binding(get: { model.dice.contrast }, set: { v in model.updateDice { $0.contrast = v.rounded() } }), range: 0...100, step: 1) { "\(Int($0))" }
                    case .brightness: slider(value: Binding(get: { model.dice.gamma }, set: { v in model.updateDice { $0.gamma = (v * 100).rounded() / 100 } }), range: 0.5...1.5, step: 0.01) { "\(Int((($0 - 1) * 100).rounded()))%" }
                    case .sharpening: slider(value: Binding(get: { model.dice.edgeSharpening }, set: { v in model.updateDice { $0.edgeSharpening = v.rounded() } }), range: 0...100, step: 1) { "\(Int($0))" }
                    // The tool tab names these two; no header above them
                    case .color: colorMode
                    case .rotate: rotateToggles
                    }
                }
                .padding(.horizontal, 4)
            }
            Picker("Tool", selection: $active) {
                ForEach(Tool.allCases, id: \.self) { tool in
                    Image(systemName: tool.symbol).tag(tool).accessibilityLabel(tool.label)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    /// "PRO over N" when the plan has a design row limit below the slider's maximum (none does today).
    private var rowsBadge: String? {
        guard let limit = session.entitlements.designRowLimit, limit < 120 else { return nil }
        return "PRO OVER \(limit)"
    }

    /// Header of a control: the active tool's name (and a PRO tag) on the left; on the right the grid size or the value.
    private func header(trailing: String, badge: String? = nil) -> some View {
        HStack(spacing: 6) {
            Text(active.label).foregroundStyle(Color.textSecondary)
            if let badge { ProBadge(text: badge) }
            Spacer()
            Text(trailing).foregroundStyle(.white)
        }
        .font(.footnote.weight(.medium))
        .monospacedDigit()
    }

    private var gridSize: String { model.expectedGridSize.map { "\($0.width) × \($0.height)" } ?? "—" }

    private func slider(value: Binding<Double>, range: ClosedRange<Double>, step: Double, badge: String? = nil, format: @escaping (Double) -> String) -> some View {
        VStack(spacing: 4) {
            header(trailing: format(value.wrappedValue), badge: badge)
            Slider(value: value, in: range, step: step) { editing in
                if editing { model.beginInteraction() } else { model.endInteraction() }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(active.label)
    }

    /// Which dice colours the art uses; Mixed carries a PRO tag when the plan lacks it (ColorModeControl).
    private var colorMode: some View {
        HStack(spacing: 8) {
            ForEach([(ColorMode.both, "Mixed"), (.black, "Black"), (.white, "White")], id: \.0) { mode, label in
                Toggle(isOn: Binding(get: { model.dice.colorMode == mode }, set: { on in if on { model.updateDice { $0.colorMode = mode } } })) {
                    HStack(spacing: 6) {
                        Swatch(mode: mode)
                        Text(label).font(.footnote.weight(.medium))
                    }
                    .frame(maxWidth: .infinity)
                }
                .toggleStyle(.button)
                .glassButton()
                .overlay(alignment: .topTrailing) {
                    if mode == .both && !session.entitlements.hasMixedDice { ProBadge().offset(x: 4, y: -8) }
                }
            }
        }
    }

    private var rotateToggles: some View {
        HStack(spacing: 8) {
            ForEach([(2, \DiceParams.rotate2), (3, \DiceParams.rotate3), (6, \DiceParams.rotate6)], id: \.0) { face, key in
                Toggle(isOn: Binding(get: { model.dice[keyPath: key] }, set: { on in model.updateDice { $0[keyPath: key] = on } })) {
                    Image(decorative: DiceRenderer.dieImage(Die(face: face, color: .white, rotate90: model.dice[keyPath: key]), size: 56), scale: 2)
                        .frame(maxWidth: .infinity)
                }
                .toggleStyle(.button)
                .glassButton()
                .accessibilityLabel("Rotate the \(face) faces 90°")
            }
        }
    }
}

private struct Swatch: View {
    let mode: ColorMode
    var body: some View {
        RoundedRectangle(cornerRadius: 3)
            .fill(mode == .black ? AnyShapeStyle(Color.black) : mode == .white ? AnyShapeStyle(Color.white) : AnyShapeStyle(LinearGradient(colors: [.white, .white, .black, .black], startPoint: .topLeading, endPoint: .bottomTrailing)))
            .frame(width: 14, height: 14)
            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(Color.white.opacity(0.55), lineWidth: 1))
    }
}
