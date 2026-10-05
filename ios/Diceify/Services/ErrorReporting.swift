import Foundation
import os
import Sentry

private let log = Logger(subsystem: "art.diceify.app", category: "errors")

/// The one place that talks to Sentry (lib/report-error.ts): `reportError(_:where:)` and `setErrorUser`. Without a
/// DSN (`SENTRY_DSN` in Config/*.xcconfig) nothing is sent and errors go to the unified log instead. No automatic
/// user data; only the user id is attached, explicitly.
enum ErrorReporting {
    private nonisolated(unsafe) static var enabled = false

    static func start() {
        guard !enabled, let dsn = AppConfig.sentryDSN else { return }
        SentrySDK.start { options in
            options.dsn = dsn
            options.sendDefaultPii = false
            options.tracesSampleRate = 0
            options.enableAutoSessionTracking = true
        }
        enabled = true
    }

    /// Report an unexpected error with a short, stable site name (`autosave-save`, `share-create`, …).
    static func report(_ error: Error, where site: String) {
        if enabled {
            SentrySDK.capture(error: error) { scope in scope.setTag(value: site, key: "where") }
        }
        log.error("[\(site, privacy: .public)] \(String(describing: error), privacy: .public)")
    }

    /// Tag later events with the signed-in user's id (nil after sign-out).
    static func setUser(_ id: UUID?) {
        guard enabled else { return }
        SentrySDK.setUser(id.map { User(userId: $0.uuidString.lowercased()) })
    }
}

func reportError(_ error: Error, where site: String) {
    ErrorReporting.report(error, where: site)
}
