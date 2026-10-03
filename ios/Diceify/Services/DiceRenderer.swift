import CoreGraphics
import DiceCore
import Foundation

/// Core Graphics rendering of dice (the app's counterpart of core/dice/svg.ts for pixels): the tune preview, the
/// progress preview, the share card's art and the build viewer all draw dice from one cache of die images.
enum DiceRenderer {
    nonisolated(unsafe) private static var cache: [String: CGImage] = [:]
    private static let lock = NSLock()

    static let colorSpace = CGColorSpaceCreateDeviceRGB()

    private static func color(_ hex: String) -> CGColor {
        var h = hex.dropFirst()
        if h.count == 3 { h = Substring(h.map { "\($0)\($0)" }.joined()) }
        let v = UInt32(h, radix: 16) ?? 0
        return CGColor(colorSpace: colorSpace, components: [Double((v >> 16) & 0xFF) / 255, Double((v >> 8) & 0xFF) / 255, Double(v & 0xFF) / 255, 1])!
    }

    /// Draw one die into `rect` (the die's `DiceRendering` geometry: rounded corners, border, dots).
    static func drawDie(_ die: Die, in rect: CGRect, context ctx: CGContext) {
        let colors = DiceRendering.colors(die.color)
        let size = min(rect.width, rect.height)
        ctx.saveGState()
        ctx.translateBy(x: rect.midX, y: rect.midY)
        if die.rotate90 { ctx.rotate(by: .pi / 2) }
        let box = CGRect(x: -size / 2, y: -size / 2, width: size, height: size)
        let stroke = size * DiceRendering.borderWidthFactor
        let path = CGPath(roundedRect: box.insetBy(dx: stroke / 2, dy: stroke / 2), cornerWidth: size * DiceRendering.cornerRadiusFactor, cornerHeight: size * DiceRendering.cornerRadiusFactor, transform: nil)
        ctx.addPath(path)
        ctx.setFillColor(color(colors.background))
        ctx.fillPath()
        ctx.addPath(path)
        ctx.setStrokeColor(color(DiceRendering.stroke))
        ctx.setLineWidth(stroke)
        ctx.strokePath()
        ctx.setFillColor(color(colors.dot))
        let radius = size * DiceRendering.dotRadiusFactor
        for dot in dotPositions(face: die.face, size: size) {
            // dot positions are y-down from the top-left; the context here is y-up around the centre
            ctx.fillEllipse(in: CGRect(x: -size / 2 + dot.x - radius, y: size / 2 - dot.y - radius, width: 2 * radius, height: 2 * radius))
        }
        ctx.restoreGState()
    }

    /// A die as a bitmap of `size` px (cached): the viewer and previews blit these.
    static func dieImage(_ die: Die, size: Int) -> CGImage {
        let key = "\(encodeDie(die))@\(size)"
        lock.lock()
        if let hit = cache[key] {
            lock.unlock()
            return hit
        }
        lock.unlock()
        let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        drawDie(die, in: CGRect(x: 0, y: 0, width: size, height: size), context: ctx)
        let image = ctx.makeImage()!
        lock.lock()
        cache[key] = image
        lock.unlock()
        return image
    }

    /// Draw `grid` (rows[0] at the bottom) filling `rect` of a y-up context, optionally ghosting the dice not yet placed.
    static func drawGrid(_ grid: DiceGrid, in rect: CGRect, context ctx: CGContext, progress: GridPos? = nil, unbuiltAlpha: Double = ProgressStyle.unbuiltOpacity) {
        let cell = rect.width / Double(grid.width)
        let cellH = rect.height / Double(grid.height)
        let px = max(4, Int(ceil(cell)))
        for y in 0..<grid.height {
            let row = grid.rows[y]
            // y = 0 is the bottom row; CG's y grows upwards, so bottom row sits at rect.minY
            let originY = rect.minY + Double(y) * cellH
            for x in 0..<grid.width {
                let die = row[x]
                let target = CGRect(x: rect.minX + Double(x) * cell, y: originY, width: cell, height: cellH)
                let placed = progress.map { isCompleted(GridPos(x: x, y: y), progress: $0) } ?? true
                if !placed { ctx.setAlpha(unbuiltAlpha) }
                ctx.draw(dieImage(die, size: px), in: target)
                if !placed { ctx.setAlpha(1) }
            }
        }
    }

    /// The whole grid as a bitmap of `size` (`renderGridSvg` + `rasterizeSvg`). Background black like the web preview.
    static func render(_ grid: DiceGrid, size: SvgSize, background: String = "#000000", progress: GridPos? = nil) -> CGImage? {
        guard size.width > 0, size.height > 0,
              let ctx = CGContext(data: nil, width: size.width, height: size.height, bitsPerComponent: 8, bytesPerRow: size.width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return nil }
        ctx.setFillColor(color(background))
        ctx.fill(CGRect(x: 0, y: 0, width: size.width, height: size.height))
        ctx.interpolationQuality = .high
        drawGrid(grid, in: CGRect(x: 0, y: 0, width: size.width, height: size.height), context: ctx, progress: progress)
        return ctx.makeImage()
    }

    /// The progress preview (`renderProgressSvg`): cream background, placed dice solid, the rest ghosted.
    static func renderProgress(_ grid: DiceGrid, progress: GridPos, showAll: Bool, size: SvgSize) -> CGImage? {
        render(grid, size: size, background: ProgressStyle.background, progress: showAll ? nil : progress)
    }
}
