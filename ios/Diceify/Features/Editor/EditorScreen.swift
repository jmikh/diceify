import DiceCore
import SwiftUI

/// Step 4 fills this in (crop → tune → build). For now: the project's photo and its document step, so navigation,
/// caching and the local store are exercised end to end.
struct EditorScreen: View {
    let projectId: UUID
    @Environment(AppSession.self) private var session
    @Environment(ProjectsStore.self) private var projects
    @State private var entry: LocalStore.Entry?
    @State private var document: ProjectDocument?
    @State private var image: UIImage?
    @State private var failure: String?

    var body: some View {
        ZStack {
            Color.bgPrimary.ignoresSafeArea()
            if let image {
                VStack(spacing: 16) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                        .padding(16)
                        .glassPanel(cornerRadius: 22)
                    Text("Step: \(document?.step.rawValue.capitalized ?? "-") · editor arrives in step 4")
                        .font(.footnote)
                        .foregroundStyle(Color.textMuted)
                }
                .padding(16)
            } else if let failure {
                Text(failure).foregroundStyle(.red)
            } else {
                ProgressView()
            }
        }
        .navigationTitle(entry?.meta.name ?? "Project")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: session.status) {
            // Wait for the session (a cloud project needs the user id to be fetched); run once it is known
            guard session.status != .loading, image == nil, failure == nil else { return }
            do {
                let loaded: LocalStore.Entry
                if let local = projects.local.entry(projectId) {
                    loaded = local
                } else if let userId = session.user?.id {
                    loaded = try await projects.cache(projectId, userId: userId)
                } else {
                    throw CocoaError(.fileNoSuchFile)
                }
                entry = loaded
                document = try projects.local.document(projectId)
                image = UIImage(data: try projects.local.image(projectId))
            } catch {
                failure = "This project could not be opened."
            }
        }
    }
}
