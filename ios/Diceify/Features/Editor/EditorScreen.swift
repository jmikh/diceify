import DiceCore
import SwiftUI

/// The editor shell (features/editor/components/mobile/MobileEditor.tsx in iOS clothes): the project name as the
/// navigation title (tap → rename), share / upgrade in the toolbar, the stage edge to edge and the step's controls in
/// the thumb zone between the step back / next chevrons (no step tabs on the phone, as on mobile web). One
/// `EditorModel` per open project.
struct EditorScreen: View {
    let projectId: UUID
    @Environment(AppSession.self) private var session
    @Environment(ProjectsStore.self) private var projects
    @Environment(\.scenePhase) private var scenePhase
    @State private var model: EditorModel?
    @State private var failure: String?
    @State private var prompt: GatePrompt?
    @State private var shareFlow = ShareFlow()
    @State private var shareOpen = false

    var body: some View {
        ZStack {
            Color.bgPrimary.ignoresSafeArea()
            if let model {
                EditorBody(model: model, prompt: $prompt)
            } else if let failure {
                Text(failure).foregroundStyle(.red)
            } else {
                ProgressView()
            }
        }
        .navigationTitle(titleBinding)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let model {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if model.step != .crop {
                        Button {
                            if let p = session.gate(session.status == .authed, .share, requires: .account, signInMessage: "Sign in to share your dice art.") { prompt = p } else { shareOpen = true }
                        } label: { Image(systemName: "square.and.arrow.up") }
                        .disabled(model.grid == nil)
                        .accessibilityLabel("Share")
                    }
                    // Upgrade, in the same spot on every step (UpgradeControl): hidden on a paid plan and while the
                    // profile loads, so Pro users never see it flash
                    if session.status == .anon || (session.status == .authed && !session.entitlements.isPro) {
                        Button("Upgrade") { prompt = session.upgradePrompt(source: "editor_header") }
                            .buttonStyle(.borderedProminent)
                    }
                }
            }
        }
        .sheet(isPresented: $shareOpen) {
            if let model { ShareSheet(model: model, flow: shareFlow) }
        }
        .sheet(item: $prompt) { prompt in
            switch prompt {
            case let .signIn(message): SignInSheet(message: message)
            case .limit, .proFeature: PaywallSheet(prompt: prompt)
            }
        }
        .task(id: session.status) {
            guard session.status != .loading else { return }
            if let model {
                model.userId = session.status == .authed ? session.user?.id : nil
                #if DEBUG
                debugOpenShare()
                #endif
                return
            }
            do {
                if projects.local.entry(projectId) == nil, let userId = session.user?.id {
                    _ = try await projects.cache(projectId, userId: userId)
                }
                let opened = try EditorModel.open(projectId: projectId, local: projects.local, saver: ProjectRepository(), userId: session.status == .authed ? session.user?.id : nil)
                model = opened
                Analytics.screen("editor")
                Analytics.track(.editorOpened(signedIn: session.status == .authed, restored: opened.crop != nil))
                #if DEBUG
                let args = ProcessInfo.processInfo.arguments
                if let at = args.firstIndex(of: "--ui-step"), at + 1 < args.count, let step = DocumentStep(rawValue: args[at + 1]), opened.step != step {
                    if opened.crop == nil { opened.untracked { opened.setCrop(opened.initialCrop()) } }
                    opened.go(to: .tune)
                    opened.go(to: step)
                }
                debugOpenShare()
                #endif
            } catch {
                failure = "This project could not be opened."
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { Task { await model?.flushSave() } }
        }
        .onDisappear {
            let model = self.model
            Task {
                await model?.flushSave()
                await projects.refresh(userId: session.status == .authed ? session.user?.id : nil)
            }
        }
    }

    /// The system's title menu renames the project (an empty name is ignored).
    private var titleBinding: Binding<String> {
        Binding(
            get: { model?.name ?? "Project" },
            set: { value in
                let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
                guard let model, !trimmed.isEmpty, trimmed != model.name else { return }
                model.name = trimmed
                model.scheduleSave()
            }
        )
    }
}

#if DEBUG
private extension EditorScreen {
    /// `--ui-share`: open the share sheet once signed in (the share needs a session).
    func debugOpenShare() {
        if ProcessInfo.processInfo.arguments.contains("--ui-share"), session.status == .authed, !shareOpen { shareOpen = true }
    }
}
#endif

/// Cloud/local save state in the toolbar (SaveStatusLine on the web).
struct SaveStatusView: View {
    let status: EditorModel.SaveStatus

    var body: some View {
        Group {
            switch status {
            case .saving: ProgressView().controlSize(.mini)
            case .error: Image(systemName: "exclamationmark.triangle").foregroundStyle(.orange)
            case .offline: Image(systemName: "icloud.slash").foregroundStyle(Color.textMuted)
            default: EmptyView()
            }
        }
        .accessibilityLabel(status == .saving ? "Saving" : status == .error ? "Save failed" : status == .offline ? "Offline, saved on this phone" : "")
    }
}

private struct EditorBody: View {
    @Bindable var model: EditorModel
    @Binding var prompt: GatePrompt?

    var body: some View {
        VStack(spacing: 12) {
            Group {
                switch model.step {
                case .crop: CropView(model: model)
                case .tune: TuneView(model: model, prompt: $prompt)
                case .build: BuildView(model: model, prompt: $prompt)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // Save state over the stage's corner, not in the toolbar (which would overflow with share + upgrade)
            .overlay(alignment: .topLeading) {
                SaveStatusView(status: model.saveStatus).padding(12)
            }
            Group {
                switch model.step {
                case .crop: CropControls(model: model)
                case .tune: TuneControls(model: model)
                case .build: BuildControls(model: model, prompt: $prompt)
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 8)
        // The dice count under the title on tune and build (iOS 26 then lays the title out leading, which also keeps
        // share + upgrade from collapsing into an overflow menu)
        .navigationSubtitleIfAvailable(model.step == .crop ? nil : model.grid.map { "\(formatDiceCount($0.width * $0.height)) dice" })
        .alert("Start over?", isPresented: Binding(get: { model.pendingResetStep != nil }, set: { if !$0 { model.pendingResetStep = nil } })) {
            Button("Go back", role: .destructive) { model.confirmPendingStep() }
            Button("Stay", role: .cancel) { model.pendingResetStep = nil }
        } message: {
            Text("Changing the crop or the dice settings resets your build progress.")
        }
        .alert("Project updated", isPresented: Binding(get: { model.conflictNotice != nil }, set: { if !$0 { model.conflictNotice = nil } })) {
            Button("OK") { model.conflictNotice = nil }
        } message: {
            Text(model.conflictNotice ?? "")
        }
    }
}

extension View {
    /// iOS 26's navigation subtitle; nothing on earlier versions.
    @ViewBuilder
    func navigationSubtitleIfAvailable(_ text: String?) -> some View {
        if #available(iOS 26, *), let text {
            navigationSubtitle(text)
        } else {
            self
        }
    }
}

/// Mobile layout constants (rows.ts): the main row keeps one height on every step so the stage does not jump.
enum EditorLayout {
    static let controlRow: CGFloat = 64
    /// Buttons inside the main row (step back / next, the build tools).
    static let rowButton: CGFloat = 44
}

/// A step's main row (MobileStepRow): step back on the left, the step's control (`content`) filling the rest, step
/// next on the right — the same buttons in the same places on every step. Nothing on the first / last step.
struct StepRow<Content: View>: View {
    @Bindable var model: EditorModel
    @ViewBuilder let content: Content

    var body: some View {
        HStack(spacing: 8) {
            if Steps.prev(model.step) != nil {
                Button { model.goBack() } label: { Image(systemName: "chevron.left").font(.body.weight(.semibold)).frame(width: 20, height: EditorLayout.rowButton - 14) }
                    .glassButton()
                    .accessibilityLabel("Previous step")
            }
            content.frame(maxWidth: .infinity)
            if let next = Steps.next(model.step) {
                Button { model.goNext() } label: { Image(systemName: "chevron.right").font(.body.weight(.semibold)).frame(width: 20, height: EditorLayout.rowButton - 14) }
                    .glassButton(prominent: true)
                    .disabled(!model.canGoNext)
                    .accessibilityLabel("Next: \(Steps.label(next))")
            }
        }
        .frame(height: EditorLayout.controlRow)
    }
}
