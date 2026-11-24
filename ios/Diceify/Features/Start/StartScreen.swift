import PhotosUI
import SwiftUI

/// Where projects begin (features/editor/components/start/StartScreen.tsx): a photo always starts a new project;
/// below, the user's projects (signed in) or the one local draft (signed out).
struct StartScreen: View {
    @Environment(AppSession.self) private var session
    @Environment(ProjectsStore.self) private var projects
    @State private var signInOpen = false
    @State private var picked: PhotosPickerItem?
    @State private var photosOpen = false
    @State private var importing = false
    @State private var cameraOpen = false
    @State private var openProject: UUID?
    @State private var promotedFor: UUID?
    @State private var accountOpen = false

    private var userId: UUID? { session.status == .authed ? session.user?.id : nil }
    private var hasCamera: Bool { UIImagePickerController.isSourceTypeAvailable(.camera) }

    var body: some View {
        ZStack {
            OrbsBackground()
            if projects.items.isEmpty {
                emptyState
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if let error = projects.error {
                            Label(error, systemImage: "exclamationmark.triangle").font(.footnote).foregroundStyle(.red)
                        }
                        ProjectGrid(items: projects.items, onOpen: { openProject = $0 }, onRename: { id, name in Task { await projects.rename(id, to: name, userId: userId) } }, onDelete: { id in Task { await projects.delete(id, userId: userId) } })
                        if session.status == .anon, projects.items.contains(where: \.isLocalOnly) {
                            draftNote
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 40)
                }
            }
        }
        .navigationTitle("Projects")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) { accountControl }
            if #available(iOS 26, *) {
                ToolbarSpacer(.fixed, placement: .topBarTrailing)
            }
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    newProjectActions
                } label: {
                    if importing { ProgressView() } else { Image(systemName: "plus") }
                }
                .disabled(importing)
                .accessibilityLabel("New project")
            }
        }
        .photosPicker(isPresented: $photosOpen, selection: $picked, matching: .images, photoLibrary: .shared())
        .sheet(isPresented: $signInOpen) { SignInSheet() }
        .fullScreenCover(isPresented: $cameraOpen) {
            CameraPicker { data in Task { await importPhoto(data) } }
                .ignoresSafeArea()
        }
        .navigationDestination(item: $openProject) { id in
            EditorScreen(projectId: id)
        }
        .navigationDestination(isPresented: $accountOpen) { AccountScreen() }
        .onChange(of: picked) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self) { await importPhoto(data) }
                picked = nil
            }
        }
        .task(id: session.status) {
            guard session.status != .loading else { return }
            if let userId, promotedFor != userId {
                promotedFor = userId
                await projects.promoteDrafts(userId: userId)
            } else if session.status == .anon, promotedFor != nil {
                promotedFor = nil
                await projects.clearCloudCache()
            } else {
                await projects.refresh(userId: userId)
            }
        }
        .onAppear {
            Analytics.screen("start")
            #if DEBUG
            // Driving the app from the terminal (xcrun simctl launch … --ui-signin / --ui-import <file in Documents>)
            let args = ProcessInfo.processInfo.arguments
            if args.contains("--ui-signin") { signInOpen = true }
            if args.contains("--ui-account") {
                // a push on the first frame is dropped: let the stack settle
                Task { try? await Task.sleep(for: .milliseconds(400)); accountOpen = true }
            }
            if let at = args.firstIndex(of: "--ui-login"), at + 2 < args.count {
                Task { await session.debugSignIn(email: args[at + 1], password: args[at + 2]) }
            }
            if let at = args.firstIndex(of: "--ui-open"), at + 1 < args.count, let id = UUID(uuidString: args[at + 1]) {
                openProject = id
            }
            if let at = args.firstIndex(of: "--ui-import"), at + 1 < args.count {
                let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent(args[at + 1])
                // after the stored session is restored, so a signed-in import becomes a cloud project
                if let data = try? Data(contentsOf: url) {
                    Task {
                        while session.status == .loading { try? await Task.sleep(for: .milliseconds(100)) }
                        await importPhoto(data)
                    }
                }
            }
            #endif
        }
    }

    /// Photos / Camera: the `+` menu and the empty state's buttons.
    @ViewBuilder
    private var newProjectActions: some View {
        Button { photosOpen = true } label: { Label("Choose a photo", systemImage: "photo.on.rectangle") }
        if hasCamera {
            Button { cameraOpen = true } label: { Label("Take a photo", systemImage: "camera") }
        }
    }

    /// No projects yet: what the app does and how to start (the web's hero card).
    private var emptyState: some View {
        ContentUnavailableView {
            Label("Turn any photo into dice art", systemImage: "dice")
        } description: {
            Text("Pick a photo, crop it, tune the dice, then build it row by row. The photo stays with its project; a different photo starts another one.")
        } actions: {
            VStack(spacing: 10) {
                Button { photosOpen = true } label: { Label("Choose a photo", systemImage: "photo.on.rectangle") }
                    .buttonStyle(.primary)
                if hasCamera {
                    Button { cameraOpen = true } label: { Label("Take a photo", systemImage: "camera") }
                        .buttonStyle(.secondary)
                }
                if let error = projects.error {
                    Text(error).font(.footnote).foregroundStyle(.red)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 8)
        }
        .disabled(importing)
    }

    private var draftNote: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "info.circle")
            Text("A new photo replaces your draft on this phone. ")
                + Text("Sign in").foregroundStyle(Color.brandPinkLight).fontWeight(.medium)
                + Text(" first to keep it.")
        }
        .font(.footnote)
        .foregroundStyle(Color.textSecondary)
        .onTapGesture { signInOpen = true }
    }

    @ViewBuilder
    private var accountControl: some View {
        switch session.status {
        case .loading:
            ProgressView()
        case .anon:
            Button("Sign in") { signInOpen = true }
        case .authed:
            Button { accountOpen = true } label: { Image(systemName: "person.crop.circle") }
                .accessibilityLabel("Account")
        }
    }

    private func importPhoto(_ data: Data) async {
        importing = true
        defer { importing = false }
        do {
            let id = try await projects.create(fromPhoto: data, userId: userId)
            Analytics.track(.photoUploaded(fileType: ImageKit.mimeType(of: data), fileSize: data.count))
            openProject = id
        } catch {
            projects.error = "That photo could not be read."
        }
    }
}

/// 2-column tiles: thumbnail, name, progress (features/editor/components/start/ProjectGrid.tsx).
struct ProjectGrid: View {
    let items: [ProjectsStore.Item]
    let onOpen: (UUID) -> Void
    let onRename: (UUID, String) -> Void
    let onDelete: (UUID) -> Void
    @State private var renaming: ProjectsStore.Item?
    @State private var newName = ""
    @State private var deleting: ProjectsStore.Item?

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)], alignment: .leading, spacing: 20) {
            ForEach(items) { item in
                Button { onOpen(item.id) } label: { ProjectCard(item: item) }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button { renaming = item; newName = item.name } label: { Label("Rename", systemImage: "pencil") }
                        Button(role: .destructive) { deleting = item } label: { Label("Delete", systemImage: "trash") }
                    }
            }
        }
        .alert("Rename project", isPresented: Binding(get: { renaming != nil }, set: { if !$0 { renaming = nil } })) {
            TextField("Name", text: $newName)
            Button("Save") { if let item = renaming { onRename(item.id, newName) }; renaming = nil }
            Button("Cancel", role: .cancel) { renaming = nil }
        }
        .alert("Delete \"\(deleting?.name ?? "")\"?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } })) {
            Button("Delete", role: .destructive) { if let item = deleting { onDelete(item.id) }; deleting = nil }
            Button("Cancel", role: .cancel) { deleting = nil }
        } message: {
            Text("Its photo and build progress go with it.")
        }
    }
}

/// A Photos-style tile: the thumbnail, the name and a one-line status beneath, no card around it.
struct ProjectCard: View {
    let item: ProjectsStore.Item

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // A square well; the photo fills it without proposing its own size to the grid
            Color.white.opacity(0.06)
                .aspectRatio(1, contentMode: .fit)
                .overlay {
                    if let url = item.previewURL {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            ProgressView()
                        }
                    } else {
                        Image(systemName: "photo").font(.title2).foregroundStyle(Color.textMuted)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            Text(item.name)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white)
                .lineLimit(1)
            HStack(spacing: 6) {
                if item.totalDice > 0 {
                    ProgressView(value: item.percent, total: 100).frame(maxWidth: 56)
                    Text("\(Int(item.percent.rounded()))%").monospacedDigit()
                } else {
                    Text("Not cropped yet")
                }
                Spacer()
                if item.isLocalOnly { Image(systemName: "iphone").accessibilityLabel("Only on this phone") }
            }
            .font(.caption)
            .foregroundStyle(Color.textMuted)
        }
    }
}

/// The system camera (devices only; the simulator has none).
struct CameraPicker: UIViewControllerRepresentable {
    let onImage: (Data) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage, let data = image.jpegData(compressionQuality: 0.95) { parent.onImage(data) }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}
