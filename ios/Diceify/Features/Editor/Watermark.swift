import SwiftUI

/// The design paywall's watermark (features/editor/components/common/Watermark.tsx): the Diceify text logo on a
/// dark translucent pill, tiled diagonally in a brick layout over the art only. `grid` is the art's size in dice;
/// the art is letterboxed in the view like the previews (`scaledToFit`), so the tiles cover exactly that box.
struct Watermark: View {
    let grid: (width: Int, height: Int)

    private static let logoTextEm = 4.1
    private static let angle = Angle.degrees(-28)

    var body: some View {
        Canvas { ctx, size in
            let w = Double(grid.width), h = Double(grid.height)
            guard w > 0, h > 0 else { return }
            // The art's box: `meet` letterboxing of the grid in the view
            let scale = min(size.width / w, size.height / h)
            let box = CGRect(x: (size.width - w * scale) / 2, y: (size.height - h * scale) / 2, width: w * scale, height: h * scale)
            let tileW = max(w, h) / 2.4 * scale
            let tileH = tileW * 0.8
            let fontSize = tileW * 0.1
            let textW = fontSize * Self.logoTextEm
            let pillW = textW + fontSize * 1.1
            let pillH = fontSize * 1.6
            let mark = ctx.resolve((Text("Dice").foregroundStyle(.white) + Text("ify").foregroundStyle(Color.brandPink)).font(.custom("Syne-Bold", size: fontSize)))
            ctx.clip(to: Path(box))
            ctx.translateBy(x: box.midX, y: box.midY)
            ctx.rotate(by: Self.angle)
            ctx.opacity = 0.7
            // Enough tiles to cover the box's diagonal in every direction after the rotation
            let reach = Int(ceil(hypot(box.width, box.height) / min(tileW, tileH))) + 1
            for row in -reach...reach {
                for col in -reach...reach {
                    let x = Double(col) * tileW + (row.isMultiple(of: 2) ? tileW / 2 : 0)
                    let y = Double(row) * tileH / 2
                    let pill = CGRect(x: x - pillW / 2, y: y - pillH / 2, width: pillW, height: pillH)
                    ctx.fill(Path(roundedRect: pill, cornerRadius: pillH * 0.3), with: .color(.black.opacity(0.4)))
                    ctx.draw(mark, in: CGRect(x: x - textW / 2, y: y - fontSize * 0.7, width: textW, height: fontSize * 1.4))
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}
