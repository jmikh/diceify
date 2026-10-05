import DiceCore
import Foundation
import Supabase
import UIKit

/// The social card of a share (lib/image/shareCard.ts): dark background with the brand glow, the dice art flush
/// with the left edge, the logo, the dice count and where to make your own. `shareCardLayout` (DiceCore) decides
/// where things go; this draws them with UIKit at 1200 × 630 and encodes a JPEG for the public `share-images` bucket.
enum ShareCardRenderer {
    private static let pink = UIColor(red: 1, green: 45 / 255, blue: 146 / 255, alpha: 1)
    /// logo-full.svg (viewBox 118 × 32), drawn 44 px tall.
    private static let logoHeight: CGFloat = 44
    private static let logoWidth: CGFloat = (44 * 118 / 32).rounded()

    private struct Line {
        let text: String
        let font: (CGFloat) -> UIFont
        let color: UIColor
        var size: CGFloat
        /// Space above this line.
        let gap: CGFloat
    }

    @MainActor
    static func render(_ grid: DiceGrid) throws -> Data {
        let layout = shareCardLayout(cols: grid.width, rows: grid.height)
        let art = layout.art, text = layout.text
        let copy = ShareGrid(cols: grid.width, rows: grid.height)
        var lines = [
            Line(text: formatDiceCount(grid.width * grid.height), font: { .custom("Syne-Bold", $0, weight: .bold) }, color: .white, size: 92, gap: 40),
            Line(text: "dice · \(gridLabel(copy))", font: { .custom("Outfit-Medium", $0, weight: .medium) }, color: .white.withAlphaComponent(0.7), size: 30, gap: 6),
            Line(text: "Turn any photo into dice art", font: { .custom("Outfit-Regular", $0, weight: .regular) }, color: .white.withAlphaComponent(0.6), size: 24, gap: 48),
            Line(text: "diceify.art", font: { .custom("Outfit-Bold", $0, weight: .bold) }, color: pink, size: 30, gap: 8),
        ]
        let width = CGFloat(layout.width), height = CGFloat(layout.height)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format)
        let image = renderer.image { context in
            let ctx = context.cgContext
            // Background: the site's near-black with a pink glow behind the text and a purple one under the art
            UIColor(red: 10 / 255, green: 10 / 255, blue: 15 / 255, alpha: 1).setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
            glow(ctx, at: CGPoint(x: CGFloat(text.x + text.width), y: 0), radius: 560, color: UIColor(red: 1, green: 45 / 255, blue: 146 / 255, alpha: 0.28), size: CGSize(width: width, height: height))
            glow(ctx, at: CGPoint(x: CGFloat(art.x), y: height), radius: 520, color: UIColor(red: 124 / 255, green: 58 / 255, blue: 237 / 255, alpha: 0.22), size: CGSize(width: width, height: height))

            // The art, flush with the card's left edge (the same dice geometry as the SVG the web draws)
            let artRect = CGRect(x: CGFloat(art.x), y: CGFloat(art.y), width: CGFloat(art.width), height: CGFloat(art.height))
            UIColor.black.setFill()
            ctx.fill(artRect)
            ctx.saveGState()
            // drawGrid expects a y-up context (row 0 at the bottom); UIKit's renderer is y-down
            ctx.translateBy(x: artRect.minX, y: artRect.maxY)
            ctx.scaleBy(x: 1, y: -1)
            DiceRenderer.drawGrid(grid, in: CGRect(origin: .zero, size: artRect.size), context: ctx)
            ctx.restoreGState()

            // Text column, vertically centred: logo, dice count (shrunk to fit), grid size, call to action
            for i in lines.indices {
                let measured = (lines[i].text as NSString).size(withAttributes: [.font: lines[i].font(lines[i].size)]).width
                if measured > CGFloat(text.width) { lines[i].size = (lines[i].size * CGFloat(text.width) / measured).rounded(.down) }
            }
            let blockHeight = logoHeight + lines.reduce(0) { $0 + $1.gap + $1.size }
            var y = CGFloat(text.y) + ((CGFloat(text.height) - blockHeight) / 2).rounded()
            UIImage(named: "Logo")?.draw(in: CGRect(x: CGFloat(text.x), y: y, width: logoWidth, height: logoHeight))
            y += logoHeight
            for line in lines {
                y += line.gap
                (line.text as NSString).draw(at: CGPoint(x: CGFloat(text.x), y: y), withAttributes: [.font: line.font(line.size), .foregroundColor: line.color])
                y += line.size
            }
        }
        guard let jpeg = image.jpegData(compressionQuality: 0.9) else { throw ShareError.cardEncoding }
        return jpeg
    }

    private static func glow(_ ctx: CGContext, at center: CGPoint, radius: CGFloat, color: UIColor, size: CGSize) {
        guard let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [color.cgColor, UIColor.black.withAlphaComponent(0).cgColor] as CFArray, locations: [0, 1]) else { return }
        ctx.saveGState()
        ctx.clip(to: CGRect(origin: .zero, size: size))
        ctx.drawRadialGradient(gradient, startCenter: center, startRadius: 0, endCenter: center, endRadius: radius, options: [])
        ctx.restoreGState()
    }
}

private extension UIFont {
    /// A bundled font by PostScript name, the system font at the same weight when it is missing.
    static func custom(_ name: String, _ size: CGFloat, weight: UIFont.Weight) -> UIFont {
        UIFont(name: name, size: size) ?? .systemFont(ofSize: size, weight: weight)
    }
}

enum ShareError: Error {
    case cardEncoding
    case signedOut
}

/// A share link (lib/supabase/shares.ts): a `shares` row plus its card image `<id>.jpg` in the public bucket. Row
/// first: the storage insert policy requires the caller's own row. Shares are immutable and never deleted from the app.
struct ShareService: Sendable {
    /// The image never changes, so CDNs and crawlers may keep it for a year.
    private static let immutableCacheSeconds = "31536000"

    /// Create a share for the art; returns its id (`/s/<id>`).
    func create(projectId: UUID?, cols: Int, rows: Int, card: Data) async throws -> String {
        let client = SupabaseService.client
        guard let ownerId = try? await client.auth.session.user.id else { throw ShareError.signedOut }
        var bytes = [UInt8](repeating: 0, count: SHARE_ID_LENGTH)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        let id = try shareId(fromBytes: bytes)

        struct Insert: Encodable {
            let id: String, owner_id: String, project_id: String?, grid_cols: Int, grid_rows: Int
        }
        try await client.from("shares")
            .insert(Insert(id: id, owner_id: ownerId.uuidString.lowercased(), project_id: projectId?.uuidString.lowercased(), grid_cols: cols, grid_rows: rows))
            .execute()
        try await client.storage.from(SHARE_IMAGES_BUCKET)
            .upload(shareImageObject(id), data: card, options: FileOptions(cacheControl: Self.immutableCacheSeconds, contentType: "image/jpeg", upsert: false))
        return id
    }
}
