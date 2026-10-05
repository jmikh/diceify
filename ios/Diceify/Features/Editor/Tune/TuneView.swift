import DiceCore
import SwiftUI

/// The tune stage (TunerMain + DiceStatsInline): the rendered grid, the dice counts by colour on a translucent strip
/// along the bottom.
struct TuneView: View {
    @Bindable var model: EditorModel

    private static let stripHeight: CGFloat = 36

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.bgDeep
            // Centred in the space above the strip (the stack's bottom alignment is for the strip only)
            Group {
                if let preview = model.preview {
                    Image(decorative: preview, scale: 1)
                        .resizable()
                        .interpolation(.high)
                        .scaledToFit()
                        .opacity(model.isGenerating ? 0.6 : 1)
                        .animation(.easeOut(duration: 0.2), value: model.isGenerating)
                } else if let error = model.generationError {
                    Text(error).foregroundStyle(.red)
                } else {
                    ProgressView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.bottom, Self.stripHeight)
            HStack(spacing: 18) {
                count(model.stats.blackCount, "black", swatch: .black)
                count(model.stats.whiteCount, "white", swatch: .white)
            }
            .font(.footnote.weight(.semibold))
            .monospacedDigit()
            .frame(maxWidth: .infinity)
            .frame(height: Self.stripHeight)
            .background(.ultraThinMaterial)
            .accessibilityElement(children: .combine)
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

/// Tune controls (MobileTuneControls): one control at a time above a row of tool tiles; no surface of its own.
struct TuneControls: View {
    @Bindable var model: EditorModel
    @State private var active: Tool = .rows

    enum Tool: String, CaseIterable {
        case rows, contrast, brightness, sharpening, color, rotate

        var label: String {
            switch self {
            case .rows: "Rows"
            case .contrast: "Contrast"
            case .brightness: "Bright"
            case .sharpening: "Sharpen"
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
            Group {
                switch active {
                    case .rows: slider("Rows", value: Binding(get: { Double(model.dice.numRows) }, set: { v in model.updateDice { $0.numRows = Int(v.rounded()) } }), range: 20...120, step: 1) { "\(Int($0))" }
                    case .contrast: slider("Contrast", value: Binding(get: { model.dice.contrast }, set: { v in model.updateDice { $0.contrast = v.rounded() } }), range: 0...100, step: 1) { "\(Int($0))" }
                    case .brightness: slider("Brightness", value: Binding(get: { model.dice.gamma }, set: { v in model.updateDice { $0.gamma = (v * 100).rounded() / 100 } }), range: 0.5...1.5, step: 0.01) { "\(Int((($0 - 1) * 100).rounded()))%" }
                    case .sharpening: slider("Sharpening", value: Binding(get: { model.dice.edgeSharpening }, set: { v in model.updateDice { $0.edgeSharpening = v.rounded() } }), range: 0...100, step: 1) { "\(Int($0))" }
                case .color: VStack(spacing: 6) { header("Color", trailing: gridSize); colorMode }
                case .rotate: VStack(spacing: 6) { header("Rotate", trailing: gridSize); rotateToggles }
                }
            }
            .padding(.horizontal, 6)
            .frame(maxWidth: .infinity)
            .frame(height: EditorLayout.mainRow)
            HStack(spacing: 4) {
                ForEach(Tool.allCases, id: \.self) { tool in
                    let on = tool == active
                    Button { active = tool } label: {
                        ToolTile(label: tool.label, on: on) { Image(systemName: tool.symbol).font(.system(size: 18, weight: .medium)) }
                    }
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            .frame(height: EditorLayout.tileRow)
        }
    }

    /// Header of a control: its name on the left; on the right the grid size (rows, colour, rotate) or the value.
    private func header(_ title: String, trailing: String) -> some View {
        HStack {
            Text(title).foregroundStyle(Color.textSecondary)
            Spacer()
            Text(trailing).foregroundStyle(.white)
        }
        .font(.caption.weight(.semibold))
        .monospacedDigit()
    }

    private var gridSize: String { model.expectedGridSize.map { "\($0.width) × \($0.height)" } ?? "—" }

    private func slider(_ title: String, value: Binding<Double>, range: ClosedRange<Double>, step: Double, format: @escaping (Double) -> String) -> some View {
        VStack(spacing: 4) {
            header(title, trailing: title == "Rows" ? gridSize : format(value.wrappedValue))
            Slider(value: value, in: range, step: step) { editing in
                if editing { model.beginInteraction() } else { model.endInteraction() }
            }
            .tint(.brandPink)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(title)
    }

    private var colorMode: some View {
        HStack(spacing: 4) {
            ForEach([(ColorMode.both, "Mixed"), (.black, "Black"), (.white, "White")], id: \.0) { mode, label in
                let on = model.dice.colorMode == mode
                Button { model.updateDice { $0.colorMode = mode } } label: {
                    HStack(spacing: 6) {
                        Swatch(mode: mode)
                        Text(label).font(.footnote.weight(.medium))
                    }
                    .foregroundStyle(on ? .white : Color.textSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 40)
                    .background(on ? Color.brandPink.opacity(0.18) : .clear, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(on ? Color.brandPink.opacity(0.6) : .clear, lineWidth: 1))
                }
            }
        }
        .padding(4)
        .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    private var rotateToggles: some View {
        HStack(spacing: 6) {
            ForEach([(2, \DiceParams.rotate2), (3, \DiceParams.rotate3), (6, \DiceParams.rotate6)], id: \.0) { face, key in
                let on = model.dice[keyPath: key]
                Button { model.updateDice { $0[keyPath: key].toggle() } } label: {
                    Image(decorative: DiceRenderer.dieImage(Die(face: face, color: .white, rotate90: on), size: 60), scale: 2)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(on ? Color.brandPink.opacity(0.18) : Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(on ? Color.brandPink.opacity(0.6) : Color.white.opacity(0.08), lineWidth: 1))
                }
                .accessibilityLabel("Rotate the \(face) faces 90°")
                .accessibilityAddTraits(on ? .isSelected : [])
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
