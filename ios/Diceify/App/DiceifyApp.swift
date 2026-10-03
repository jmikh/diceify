import SwiftUI

@main
struct DiceifyApp: App {
    @State private var session = AppSession()
    @State private var projects = ProjectsStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(projects)
                .preferredColorScheme(.dark) // the brand is dark (plans/ios/ios-app-plan.md D6)
                .tint(.brandPink)
                .onOpenURL { url in session.handle(openURL: url) }
        }
    }
}

/// The root switch: the Start screen until an editor project is open (step 4 fills the editor).
struct RootView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        NavigationStack {
            StartScreen()
        }
        .task { await session.start() }
    }
}
