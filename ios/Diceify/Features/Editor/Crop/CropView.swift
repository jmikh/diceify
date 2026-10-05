import DiceCore
import SwiftUI
import UIKit

/// The crop step (CropperMain): the photo under a fixed-ratio stencil; drag to move, pinch to zoom. The document's
/// `crop` (a box in the rotated image's pixel space) is the truth: a gesture reports one history entry at its end.
struct CropView: View {
    @Bindable var model: EditorModel
    @State private var draft: CropParams?
    @State private var gestureStart: CropParams?

    private static let margin: CGFloat = 16

    var body: some View {
        GeometryReader { geo in
            let crop = draft ?? model.crop ?? model.initialCrop()
            let bounds = model.cropBounds
            let stencil = stencilRect(in: geo.size, aspect: crop.aspectRatio)
            let scale = stencil.width / crop.width
            let imageOrigin = CGPoint(x: stencil.minX - crop.x * scale, y: stencil.minY - crop.y * scale)
            ZStack(alignment: .topLeading) {
                Color.bgDeep
                Image(uiImage: orientedImage(rotation: crop.rotation))
                    .resizable()
                    .frame(width: Double(bounds.width) * scale, height: Double(bounds.height) * scale)
                    .offset(x: imageOrigin.x, y: imageOrigin.y)
                // Dim everything outside the stencil
                Path { p in
                    p.addRect(CGRect(origin: .zero, size: geo.size))
                    p.addRoundedRect(in: stencil, cornerSize: CGSize(width: 10, height: 10))
                }
                .fill(Color.black.opacity(0.55), style: FillStyle(eoFill: true))
                StencilOverlay(rect: stencil)
            }
            .contentShape(Rectangle())
            .gesture(dragGesture(crop: crop, scale: scale, bounds: bounds).simultaneously(with: pinchGesture(crop: crop, bounds: bounds, stencil: stencil)))
            .onAppear {
                if model.crop == nil { model.untracked { model.setCrop(model.initialCrop()) } }
            }
        }
        .accessibilityLabel("Crop frame. Drag to move the photo, pinch to zoom.")
        .overlay(alignment: .bottomTrailing) {
            // Rotate lives on the canvas (like the build step's zoom buttons), not in the toolbar
            Button { model.rotate90() } label: {
                Image(systemName: "rotate.right").font(.body.weight(.semibold)).foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .padding(10)
            .accessibilityLabel("Rotate 90°")
        }
    }

    private func orientedImage(rotation: Double) -> UIImage {
        let orientation: UIImage.Orientation = switch Int(rotation.rounded()) % 360 {
        case 90: .right
        case 180: .down
        case 270: .left
        default: .up
        }
        return UIImage(cgImage: model.original, scale: 1, orientation: orientation)
    }

    /// The selected ratio fitted into the stage with a margin.
    private func stencilRect(in size: CGSize, aspect: AspectRatio) -> CGRect {
        let maxW = max(0, size.width - 2 * Self.margin)
        let maxH = max(0, size.height - 2 * Self.margin)
        let ratio = aspect.ratio
        let w = min(maxW, maxH * ratio)
        let h = w / ratio
        return CGRect(x: (size.width - w) / 2, y: (size.height - h) / 2, width: w, height: h)
    }

    private func clamp(_ c: CropParams, bounds: (width: Int, height: Int)) -> CropParams {
        var out = c
        out.width = min(out.width, Double(bounds.width))
        out.height = min(out.height, Double(bounds.height))
        out.x = min(max(out.x, 0), Double(bounds.width) - out.width)
        out.y = min(max(out.y, 0), Double(bounds.height) - out.height)
        return out
    }

    /// Dragging moves the photo under the stencil: the box moves the opposite way in image space.
    private func dragGesture(crop: CropParams, scale: Double, bounds: (width: Int, height: Int)) -> some Gesture {
        DragGesture(minimumDistance: 1)
            .onChanged { value in
                if gestureStart == nil { gestureStart = crop }
                guard let start = gestureStart else { return }
                var next = start
                next.x = start.x - value.translation.width / scale
                next.y = start.y - value.translation.height / scale
                draft = clamp(next, bounds: bounds)
            }
            .onEnded { _ in commit() }
    }

    /// Pinching zooms around the stencil centre: a smaller box = zoomed in.
    private func pinchGesture(crop: CropParams, bounds: (width: Int, height: Int), stencil: CGRect) -> some Gesture {
        MagnifyGesture(minimumScaleDelta: 0.01)
            .onChanged { value in
                if gestureStart == nil { gestureStart = crop }
                guard let start = gestureStart else { return }
                let ratio = start.width / start.height
                let maxW = min(Double(bounds.width), Double(bounds.height) * ratio)
                let minW = max(32, maxW * 0.04)
                let w = min(max(start.width / value.magnification, minW), maxW)
                let h = w / ratio
                let cx = start.x + start.width / 2, cy = start.y + start.height / 2
                draft = clamp(CropParams(x: cx - w / 2, y: cy - h / 2, width: w, height: h, rotation: start.rotation, aspectRatio: start.aspectRatio), bounds: bounds)
            }
            .onEnded { _ in commit() }
    }

    private func commit() {
        if let draft { model.setCrop(draft) }
        draft = nil
        gestureStart = nil
    }
}

/// The stencil's border and rule-of-thirds lines.
private struct StencilOverlay: View {
    let rect: CGRect

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .strokeBorder(Color.white.opacity(0.9), lineWidth: 1.5)
                .frame(width: rect.width, height: rect.height)
                .offset(x: rect.minX, y: rect.minY)
            Path { p in
                for i in 1...2 {
                    let x = rect.minX + rect.width * CGFloat(i) / 3
                    let y = rect.minY + rect.height * CGFloat(i) / 3
                    p.move(to: CGPoint(x: x, y: rect.minY)); p.addLine(to: CGPoint(x: x, y: rect.maxY))
                    p.move(to: CGPoint(x: rect.minX, y: y)); p.addLine(to: CGPoint(x: rect.maxX, y: y))
                }
            }
            .stroke(Color.white.opacity(0.25), lineWidth: 0.5)
        }
        .allowsHitTesting(false)
    }
}

/// Crop controls (MobileCropControls): the aspect chips then Next, above Rotate 90°.
/// Crop toolbar (MobileCropControls): the ratio tiles — the ratio's outline in a tile, the label beneath, styled
/// like the tune tools.
struct CropControls: View {
    @Bindable var model: EditorModel

    /// Widest to tallest (there is no 9:16 in the document schema yet; 2:3 is the tallest).
    static let order: [AspectRatio] = [.sixteenNine, .fourThree, .square, .threeFour, .twoThree]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(CropControls.order, id: \.self) { aspect in
                let on = (model.crop?.aspectRatio ?? DEFAULT_ASPECT_RATIO) == aspect
                Button { model.setAspectRatio(aspect) } label: {
                    ToolTile(label: aspect.rawValue, on: on) { RatioIcon(ratio: aspect.ratio) }
                }
                .accessibilityLabel("Aspect ratio \(aspect.rawValue)")
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
        .frame(height: EditorLayout.tileRow)
    }
}

/// The ratio as a rounded outline: the longer side is 20 pt (the web's 24-unit SVG rects at 2 px stroke).
private struct RatioIcon: View {
    let ratio: Double

    var body: some View {
        let w: CGFloat = ratio >= 1 ? 20 : 20 * ratio
        let h: CGFloat = ratio >= 1 ? 20 / ratio : 20
        RoundedRectangle(cornerRadius: 2.5, style: .continuous)
            .strokeBorder(lineWidth: 1.8)
            .frame(width: w, height: h)
            .frame(height: 20)
    }
}
