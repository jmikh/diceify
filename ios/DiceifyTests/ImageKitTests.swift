import CoreGraphics
import Foundation
import ImageIO
import Testing
import UniformTypeIdentifiers
@testable import Diceify

@Suite struct ImageKitTests {
    /// A `width × height` image, left half black / right half white, encoded as JPEG with an EXIF orientation.
    private func halvesJPEG(width: Int, height: Int, orientation: Int = 1) throws -> Data {
        let space = CGColorSpaceCreateDeviceRGB()
        let ctx = try #require(CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue))
        ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
        ctx.fill(CGRect(x: 0, y: 0, width: width / 2, height: height))
        ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
        ctx.fill(CGRect(x: width / 2, y: 0, width: width - width / 2, height: height))
        let image = try #require(ctx.makeImage())
        let data = NSMutableData()
        let dest = try #require(CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil))
        CGImageDestinationAddImage(dest, image, [kCGImagePropertyOrientation: orientation, kCGImageDestinationLossyCompressionQuality: 0.95] as CFDictionary)
        #expect(CGImageDestinationFinalize(dest))
        return data as Data
    }

    private func pixel(_ image: CGImage, x: Int, y: Int) throws -> UInt8 {
        let ctx = try #require(CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: image.width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue))
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        let bytes = try #require(ctx.data?.assumingMemoryBound(to: UInt8.self))
        return bytes[(y * image.width + x) * 4]
    }

    @Test func importDownscalesToTheLongerSide() throws {
        let imported = try ImageKit.importPhoto(try halvesJPEG(width: 4000, height: 3000))
        let original = try ImageKit.decode(imported.original, maxSide: 10_000)
        #expect(original.width == 2048 && original.height == 1536)
        let preview = try ImageKit.decode(imported.preview, maxSide: 10_000)
        #expect(preview.width == 192 && preview.height == 144)
        #expect(try pixel(original, x: 10, y: 10) < 20 && (try pixel(original, x: 2000, y: 10)) > 235)
    }

    @Test func importNeverUpscales() throws {
        let imported = try ImageKit.importPhoto(try halvesJPEG(width: 300, height: 200))
        let original = try ImageKit.decode(imported.original, maxSide: 10_000)
        #expect(original.width == 300 && original.height == 200)
    }

    @Test func importAppliesExifOrientationAndDropsIt() throws {
        // Orientation 6 = rotate 90° clockwise to display: a 400 × 200 file shows as 200 × 400 with black on top
        let imported = try ImageKit.importPhoto(try halvesJPEG(width: 400, height: 200, orientation: 6))
        let original = try ImageKit.decode(imported.original, maxSide: 10_000)
        #expect(original.width == 200 && original.height == 400)
        #expect(try pixel(original, x: 100, y: 10) < 20 && (try pixel(original, x: 100, y: 390)) > 235)
        let source = try #require(CGImageSourceCreateWithData(imported.original as CFData, nil))
        let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
        #expect(props?[kCGImagePropertyOrientation] == nil)
        #expect(props?[kCGImagePropertyGPSDictionary] == nil)
    }

    @Test func rejectsGarbage() {
        #expect(throws: ImageKit.Error.self) { try ImageKit.importPhoto(Data([1, 2, 3])) }
    }
}
