import Testing
@testable import DiceCore

/// Pins the fixture harness itself (step 0). Step 2 adds the test that runs the pipeline on every fixture.
/// Swift Testing (not XCTest) so the suite runs with the Command Line Tools toolchain as well as Xcode.
@Suite struct FixtureLoadingTests {
    @Test func fixturesAreFoundAndWellFormed() throws {
        let fixtures = try Fixtures.load()
        #expect(!fixtures.isEmpty, "no fixtures under \(Fixtures.directory.path)")
        for fixture in fixtures {
            let rgba = try fixture.rgba
            #expect(rgba.count == fixture.width * fixture.height * 4, "\(fixture.name)")
            #expect(fixture.expected.rows.count == fixture.expected.height, "\(fixture.name)")
            for row in fixture.expected.rows {
                #expect(row.split(separator: " ").count == fixture.expected.width, "\(fixture.name)")
            }
        }
    }

    @Test func jsRoundMatchesMathRound() {
        #expect(jsRound(2.5) == 3)
        #expect(jsRound(2.4999) == 2)
        #expect(jsRound(-2.5) == -2)   // Math.round(-2.5) === -2; Swift's .rounded() would give -3
        #expect(jsRound(0.5) == 1)
    }
}
