import DiceCore
import SwiftUI

/// The editor shell (features/editor/components/mobile/MobileEditor.tsx): step control under the title, the stage,
/// and the step's controls in the thumb zone. One `EditorModel` per open project.
struct EditorScreen: View {
    let projectId: UUID
    @Environment(AppSession.self) private var session
    @Environment(ProjectsStore.self) private var projects
    @Environment(\.scenePhase) private var scenePhase
    @State private var model: EditorModel?
    @State private var failure: String?
    @State private var renaming = false
    @State private var newName = ""
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
        .navigationTitle(model?.name ?? "Project")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let model {
                ToolbarItem(placement: .principal) {
                    Button {
                        newName = model.name
                        renaming = true
                    } label: {
                        HStack(spacing: 4) {
                            Text(model.name).font(.headline).foregroundStyle(.white).lineLimit(1)
                            Image(systemName: "chevron.down").font(.caption2).foregroundStyle(Color.textMuted)
                        }
                    }
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if model.step != .crop {
                        Button {
                            if let p = session.gate(session.status == .authed, .share, signInMessage: "Sign in to share your dice art.") { prompt = p } else { shareOpen = true }
                        } label: { Image(systemName: "square.and.arrow.up") }
                        .disabled(model.grid == nil)
                        .accessibilityLabel("Share")
                    }
                    SaveStatusView(status: model.saveStatus)
                }
            }
        }
        .alert("Rename project", isPresented: $renaming) {
            TextField("Name", text: $newName)
            Button("Save") {
                let trimmed = newName.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty, let model { model.name = trimmed; model.scheduleSave() }
            }
            Button("Cancel", role: .cancel) {}
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

/// Mobile layout constants (features/editor/components/mobile/rows.ts).
enum EditorLayout {
    static let mainRow: CGFloat = 64
    static let toolRow: CGFloat = 56
    /// Icon tile + label (the tune tools).
    static let tileRow: CGFloat = 70
    static let stageCorner: CGFloat = 22
}

private struct EditorBody: View {
    @Bindable var model: EditorModel
    @Binding var prompt: GatePrompt?
    @Environment(AppSession.self) private var session

    var body: some View {
        VStack(spacing: 10) {
            // Step back · Crop/Tune/Build · next (the web's MobileStepRow buttons, moved up out of the thumb zone)
            HStack(spacing: 8) {
                StepBackButton(model: model).frame(width: 40, height: 40)
                StepControl(model: model)
                StepNextButton(model: model).frame(width: 40, height: 40)
            }
            Group {
                switch model.step {
                case .crop: CropView(model: model)
                case .tune: TuneView(model: model)
                case .build: BuildView(model: model, prompt: $prompt)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: EditorLayout.stageCorner, style: .continuous))
            .glassPanel(cornerRadius: EditorLayout.stageCorner)
            Group {
                switch model.step {
                case .crop: CropControls(model: model)
                case .tune: TuneControls(model: model)
                case .build: BuildControls(model: model, prompt: $prompt)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
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

/// Crop · Tune · Build (StepTabs / MobileTopBar): tabs the user may enter are tappable.
struct StepControl: View {
    @Bindable var model: EditorModel

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Steps.all, id: \.self) { step in
                let on = model.step == step
                Button {
                    model.go(to: step)
                } label: {
                    Text(Steps.label(step))
                        .font(.subheadline.weight(on ? .semibold : .medium))
                        .foregroundStyle(on ? .white : Color.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(on ? Color.brandPink.opacity(0.18) : .clear, in: Capsule())
                        .overlay(Capsule().strokeBorder(on ? Color.brandPink.opacity(0.6) : .clear, lineWidth: 1))
                }
                .disabled(!model.canGo(to: step))
                .opacity(model.canGo(to: step) ? 1 : 0.4)
            }
        }
        .padding(4)
        .background(Color.white.opacity(0.04), in: Capsule())
        .overlay(Capsule().strokeBorder(Color.borderGlass, lineWidth: 1))
    }
}

/// Step back / next buttons beside the step tabs (MobileStepButtons): nothing on the first / last step.
struct StepBackButton: View {
    @Bindable var model: EditorModel
    var body: some View {
        Button { model.goBack() } label: { Image(systemName: "chevron.left").font(.body.weight(.semibold)) }
            .buttonStyle(RowButtonStyle())
            .disabled(!model.canGoBack)
            .opacity(Steps.prev(model.step) == nil ? 0 : 1)
            .accessibilityLabel("Previous step")
    }
}

struct StepNextButton: View {
    @Bindable var model: EditorModel
    var body: some View {
        Button { model.goNext() } label: { Image(systemName: "chevron.right").font(.body.weight(.semibold)) }
            .buttonStyle(RowButtonStyle(primary: true))
            .disabled(!model.canGoNext)
            .opacity(Steps.next(model.step) == nil ? 0 : 1)
            .accessibilityLabel("Next step")
    }
}

/// A tool in the bottom row (the web's mobile tool tabs): the icon in a rounded tile, the label beneath.
struct ToolTile<Icon: View>: View {
    let label: String
    let on: Bool
    @ViewBuilder let icon: Icon

    var body: some View {
        VStack(spacing: 6) {
            icon
                .foregroundStyle(on ? Color.brandPinkLight : Color.textSecondary)
                .frame(width: 46, height: 46)
                .background(on ? Color.brandPink.opacity(0.18) : Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(on ? Color.brandPink.opacity(0.7) : Color.white.opacity(0.08), lineWidth: 1))
            Text(label)
                .font(.system(size: 12, weight: on ? .semibold : .medium))
                .foregroundStyle(on ? .white : Color.textMuted)
        }
        .frame(maxWidth: .infinity)
    }
}

/// A square-ish glass button for the control rows; `primary` = pink fill (the step's main action).
struct RowButtonStyle: ButtonStyle {
    var primary = false
    @Environment(\.isEnabled) private var enabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(primary ? Color.brandPinkStrong : Color.white.opacity(configuration.isPressed ? 0.12 : 0.06), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(primary ? .clear : Color.white.opacity(0.1), lineWidth: 1))
            .opacity(enabled ? 1 : 0.3)
    }
}
