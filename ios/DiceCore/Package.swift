// swift-tools-version:6.0
// DiceCore: the Swift port of `core/` (plans/ios/ios-app-plan.md, step 2). Pure Swift, no UIKit, no app imports.
// Tests load the TypeScript golden fixtures from `core/dice/__fixtures__` by path, so the port and the web engine
// are pinned to the same expected grids.
import PackageDescription

let package = Package(
    name: "DiceCore",
    platforms: [.iOS(.v18), .macOS(.v14)],
    products: [.library(name: "DiceCore", targets: ["DiceCore"])],
    targets: [
        .target(name: "DiceCore"),
        .testTarget(name: "DiceCoreTests", dependencies: ["DiceCore"]),
    ]
)
