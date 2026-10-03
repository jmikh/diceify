import CoreGraphics
import DiceCore
import Foundation
import Testing
@testable import Diceify

/// A `width × height` image, left half black / right half white.
private func halves(width: Int, height: Int) -> CGImage {
    let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    ctx.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: width / 2, height: height))
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: width / 2, y: 0, width: width - width / 2, height: height))
    return ctx.makeImage()!
}

private func crop(_ x: Double = 0, _ y: Double = 0, _ w: Double, _ h: Double, rotation: Double = 0) -> CropParams {
    CropParams(x: x, y: y, width: w, height: h, rotation: rotation, aspectRatio: .square)
}

@Suite struct ImageKitCropTests {
    @Test func geometryMatchesTheBrowser() {
        #expect(ImageKit.fitScale(width: 4096, height: 2048, maxSide: 2048) == 0.5)
        #expect(ImageKit.fitScale(width: 800, height: 600, maxSide: 2048) == 1)
        #expect(ImageKit.rotatedBounds(width: 400, height: 300, rotation: 0) == (400, 300))
        #expect(ImageKit.rotatedBounds(width: 400, height: 300, rotation: 90) == (300, 400))
        #expect(ImageKit.rotatedBounds(width: 400, height: 300, rotation: 45) == (495, 495))
    }

    @Test func cutsTheRegionOfTheUnrotatedImage() throws {
        let image = halves(width: 40, height: 20)
        let left = try ImageKit.cropPixels(image, crop: crop(0, 0, 20, 20))
        #expect(left.width == 20 && left.height == 20 && left.data.count == 20 * 20 * 4)
        #expect(left.data[0] < 20)
        let right = try ImageKit.cropPixels(image, crop: crop(20, 0, 20, 20))
        #expect(right.data[0] > 235)
        // top-left pixel of the output is the top-left of the region (row-major, top row first)
        let whole = try ImageKit.cropPixels(image, crop: crop(0, 0, 40, 20))
        #expect(whole.data[0] < 20 && whole.data[(39) * 4] > 235)
    }

    @Test func rotatesIntoTheBoundingBoxFirst() throws {
        // Rotated 90° clockwise, the 40 × 20 image is 20 × 40 with black on top (the web's cropImage.test)
        let px = try ImageKit.cropPixels(halves(width: 40, height: 20), crop: crop(0, 0, 20, 40, rotation: 90))
        #expect(px.width == 20 && px.height == 40)
        var params = DiceParams.default
        params.numRows = 2
        params.contrast = 0
        params.edgeSharpening = 0
        let grid = generateDiceGrid(px, params: params)
        #expect(grid.rows[1][0].color == .black && grid.rows[0][0].color == .white)
        // 270° puts white on top
        let px2 = try ImageKit.cropPixels(halves(width: 40, height: 20), crop: crop(0, 0, 20, 40, rotation: 270))
        #expect(generateDiceGrid(px2, params: params).rows[1][0].color == .white)
    }

    @Test func scalesTheCutToMaxSide() throws {
        let px = try ImageKit.cropPixels(halves(width: 40, height: 20), crop: crop(0, 0, 40, 20), maxSide: 10)
        #expect(px.width == 10 && px.height == 5)
        let thumb = try ImageKit.thumbnail(halves(width: 400, height: 200), crop: crop(0, 0, 400, 200))
        let decoded = try ImageKit.decode(thumb, maxSide: 10_000)
        #expect(decoded.width == 192 && decoded.height == 96)
    }
}

@Suite struct DiceRendererTests {
    private let grid = DiceGrid(width: 3, height: 2, rows: [
        [Die(face: 1, color: .black), Die(face: 2, color: .white, rotate90: true), Die(face: 3, color: .black)],
        [Die(face: 4, color: .white), Die(face: 5, color: .black, rotate90: true), Die(face: 6, color: .white)],
    ])

    private func pixel(_ image: CGImage, x: Int, y: Int) -> (r: UInt8, g: UInt8, b: UInt8) {
        let ctx = CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: image.width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        let p = ctx.data!.assumingMemoryBound(to: UInt8.self)
        let i = (y * image.width + x) * 4 // bitmap memory is top row first: y is y-down
        return (p[i], p[i + 1], p[i + 2])
    }

    @Test func rendersRowZeroAtTheBottom() throws {
        let image = try #require(DiceRenderer.render(grid, size: SvgSize(width: 300, height: 200)))
        #expect(image.width == 300 && image.height == 200)
        // bottom-left die is black 1 (dark background), top-left is white 4 (light background): sample near a corner, away from dots
        let bottomLeft = pixel(image, x: 10, y: 190)
        let topLeft = pixel(image, x: 10, y: 10)
        #expect(bottomLeft.r < 60 && topLeft.r > 200)
    }

    @Test func dieImagesAreCachedAndDotted() {
        let a = DiceRenderer.dieImage(Die(face: 6, color: .white), size: 64)
        let b = DiceRenderer.dieImage(Die(face: 6, color: .white), size: 64)
        #expect(a === b)
        // the centre of a white 6 has no dot (background), the centre of a white 1 does
        let six = pixel(a, x: 32, y: 32)
        let one = pixel(DiceRenderer.dieImage(Die(face: 1, color: .white), size: 64), x: 32, y: 32)
        #expect(six.r > 200 && one.r < 60)
    }

    @Test func progressGhostsUnplacedDice() throws {
        let image = try #require(DiceRenderer.renderProgress(grid, progress: GridPos(x: 1, y: 0), showAll: false, size: SvgSize(width: 300, height: 200)))
        // placed bottom-left black die stays dark; the ghosted bottom-right black 3 blends into the cream background
        #expect(pixel(image, x: 10, y: 190).r < 60)
        #expect(pixel(image, x: 210, y: 190).r > 150)
        let full = try #require(DiceRenderer.renderProgress(grid, progress: GridPos(x: 1, y: 0), showAll: true, size: SvgSize(width: 300, height: 200)))
        #expect(pixel(full, x: 210, y: 190).r < 60)
    }
}

@Suite struct StepsTests {
    @Test func rules() {
        #expect(Steps.next(.crop) == .tune && Steps.next(.tune) == .build && Steps.next(.build) == nil)
        #expect(Steps.prev(.crop) == nil && Steps.prev(.build) == .tune)
        #expect(!Steps.canAdvance(.crop, hasCrop: false) && Steps.canAdvance(.crop, hasCrop: true))
        #expect(Steps.canAdvance(.tune, hasCrop: false) && !Steps.canAdvance(.build, hasCrop: true))
        #expect(Steps.canEnter(.crop, hasCrop: false) && !Steps.canEnter(.tune, hasCrop: false) && Steps.canEnter(.build, hasCrop: true))
        #expect(Steps.needsResetConfirm(from: .build, to: .tune, progress: GridPos(x: 3, y: 0)))
        #expect(!Steps.needsResetConfirm(from: .build, to: .tune, progress: .origin))
        #expect(!Steps.needsResetConfirm(from: .tune, to: .crop, progress: GridPos(x: 3, y: 0)))
        #expect(!Steps.needsResetConfirm(from: .build, to: .build, progress: GridPos(x: 3, y: 0)))
    }
}
