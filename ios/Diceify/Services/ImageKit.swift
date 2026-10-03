import CoreGraphics
import DiceCore
import Foundation
import ImageIO
import UniformTypeIdentifiers

/// Image adapters (lib/image/decode.ts): decode, orient, downscale, encode. Core Graphics in, bytes out.
enum ImageKit {
    /// The immutable per-project original: longer side ≤ 2048, JPEG quality 0.85 (`downscaleForUpload`).
    static let originalMaxSide = 2048
    static let originalQuality = 0.85
    /// Project thumbnail (`makeThumbnail`).
    static let previewMaxSide = 192
    static let previewQuality = 0.8

    enum Error: Swift.Error { case undecodable, encodeFailed }

    /// Decode an image file (any format ImageIO reads), apply its EXIF orientation, and fit it into `maxSide`.
    /// Decodes at thumbnail size, so a 48 MP photo never lands in memory whole.
    static func decode(_ data: Data, maxSide: Int) throws -> CGImage {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { throw Error.undecodable }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: maxSide,
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { throw Error.undecodable }
        return image
    }

    /// JPEG bytes without metadata (no location, no orientation tag: the pixels are already upright).
    static func encodeJPEG(_ image: CGImage, quality: Double) throws -> Data {
        let data = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else { throw Error.encodeFailed }
        CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw Error.encodeFailed }
        return data as Data
    }

    /// A picked photo → the project original (≤ 2048 px JPEG) and its small preview.
    static func importPhoto(_ data: Data) throws -> (original: Data, preview: Data) {
        let image = try decode(data, maxSide: originalMaxSide)
        let original = try encodeJPEG(image, quality: originalQuality)
        let preview = try encodeJPEG(try decode(original, maxSide: previewMaxSide), quality: previewQuality)
        return (original, preview)
    }

    // MARK: Crop (lib/image/crop.ts + decode.ts `drawRegion`)

    /// The longer side of a cropped image handed to the dice core.
    static let cropMaxSide = 2048

    /// Scale factor that fits `width × height` inside `maxSide` on its longer axis. Never upscales.
    static func fitScale(width: Double, height: Double, maxSide: Int) -> Double {
        min(1, Double(maxSide) / max(width, height))
    }

    /// Size of the axis-aligned box that contains `width × height` rotated by `rotationDeg` (whole pixels).
    static func rotatedBounds(width: Int, height: Int, rotation: Double) -> (width: Int, height: Int) {
        let rad = rotation * .pi / 180
        let w = Double(width), h = Double(height)
        return (jsRoundInt(abs(w * cos(rad)) + abs(h * sin(rad))), jsRoundInt(abs(w * sin(rad)) + abs(h * cos(rad))))
    }

    /// Draw the crop region of `image` (after rotating the image into its bounding box, the space the crop is expressed
    /// in) into a new bitmap, scaled so the longer side is at most `maxSide`. Same transform chain as the browser:
    /// output ← scale ← crop offset ← rotation about the bounding-box centre ← image centred.
    static func drawRegion(_ image: CGImage, crop: CropParams, maxSide: Int) throws -> CGContext {
        let rotation = ((crop.rotation.truncatingRemainder(dividingBy: 360)) + 360).truncatingRemainder(dividingBy: 360)
        let w = Double(image.width), h = Double(image.height)
        let bounds = rotation == 0 ? (width: image.width, height: image.height) : rotatedBounds(width: image.width, height: image.height, rotation: rotation)
        let scale = fitScale(width: crop.width, height: crop.height, maxSide: maxSide)
        let outW = max(1, jsRoundInt(crop.width * scale))
        let outH = max(1, jsRoundInt(crop.height * scale))
        guard let ctx = CGContext(data: nil, width: outW, height: outH, bitsPerComponent: 8, bytesPerRow: outW * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else { throw Error.encodeFailed }
        ctx.interpolationQuality = .high
        // Work in the browser's y-down space: flip once, then the canvas transform chain reads the same.
        ctx.translateBy(x: 0, y: Double(outH))
        ctx.scaleBy(x: 1, y: -1)
        ctx.scaleBy(x: scale, y: scale)
        ctx.translateBy(x: -crop.x, y: -crop.y)
        ctx.translateBy(x: Double(bounds.width) / 2, y: Double(bounds.height) / 2)
        ctx.rotate(by: rotation * .pi / 180)
        ctx.translateBy(x: -w / 2, y: -h / 2)
        // CGImage draws upright in y-up space: flip the image's own box back
        ctx.translateBy(x: 0, y: h)
        ctx.scaleBy(x: 1, y: -1)
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        return ctx
    }

    /// The crop of the project original as RGBA pixels for `generateDiceGrid` (`cropToPixels`).
    static func cropPixels(_ image: CGImage, crop: CropParams, maxSide: Int = cropMaxSide) throws -> Pixels {
        let ctx = try drawRegion(image, crop: crop, maxSide: maxSide)
        guard let base = ctx.data else { throw Error.encodeFailed }
        let count = ctx.width * ctx.height * 4
        let bytes = [UInt8](UnsafeBufferPointer(start: base.assumingMemoryBound(to: UInt8.self), count: count))
        return Pixels(data: bytes, width: ctx.width, height: ctx.height)
    }

    /// A small JPEG of the crop: the project thumbnail (`makeThumbnail`, 192 px, quality 0.8).
    static func thumbnail(_ image: CGImage, crop: CropParams, maxSide: Int = previewMaxSide) throws -> Data {
        let ctx = try drawRegion(image, crop: crop, maxSide: maxSide)
        guard let out = ctx.makeImage() else { throw Error.encodeFailed }
        return try encodeJPEG(out, quality: previewQuality)
    }

    /// The stored original, decoded whole (it is at most 2048 px already).
    static func decodeOriginal(_ data: Data) throws -> CGImage {
        try decode(data, maxSide: originalMaxSide)
    }
}
