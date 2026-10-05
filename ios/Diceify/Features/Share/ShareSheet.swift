import DiceCore
import Observation
import SwiftUI

/// The share flow behind the sheet (features/editor/hooks/useShareLink.ts): render the social card for the current
/// grid, create the share, and keep it so opening the sheet again without changing the art reuses the same link.
/// One per open editor (`EditorScreen` state).
@MainActor
@Observable
final class ShareFlow {
    struct Prepared: Equatable {
        let id: String
        let card: Data
        let grid: DiceGrid
    }

    enum State: Equatable { case preparing, ready(Prepared), error }

    private(set) var state: State = .preparing
    private var prepared: Prepared?
    private var task: Task<Void, Never>?
    private let service: ShareService

    init(service: ShareService = ShareService()) {
        self.service = service
    }

    /// Prepare (or reuse) the share for this art.
    func prepare(grid: DiceGrid, projectId: UUID?) {
        if let prepared, prepared.grid == grid {
            state = .ready(prepared)
            return
        }
        task?.cancel()
        state = .preparing
        task = Task { [service] in
            do {
                let card = try ShareCardRenderer.render(grid)
                let id = try await service.create(projectId: projectId, cols: grid.width, rows: grid.height, card: card)
                guard !Task.isCancelled else { return }
                let share = Prepared(id: id, card: card, grid: grid)
                prepared = share
                state = .ready(share)
                Analytics.track(.shareCreate(shareId: id, totalDice: grid.width * grid.height))
            } catch {
                guard !Task.isCancelled else { return }
                reportError(error, where: "share-create")
                state = .error
            }
        }
    }
}

/// The share sheet (ShareModal): the card, copy the link, or hand it to the system share sheet.
struct ShareSheet: View {
    @Bindable var model: EditorModel
    @Bindable var flow: ShareFlow
    @State private var copied = false
    @State private var sharing = false

    private var share: ShareFlow.Prepared? {
        if case let .ready(share) = flow.state { return share }
        return nil
    }

    private var copy: ShareCopy? {
        model.grid.map { shareCopy(ShareGrid(cols: $0.width, rows: $0.height)) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Capsule().fill(Color.white.opacity(0.2)).frame(width: 36, height: 5).frame(maxWidth: .infinity).padding(.top, 8)
            Text("Share your dice art").font(.display(24)).foregroundStyle(.white)
            Text("Anyone with the link sees this image. Your photo stays private.")
                .font(.subheadline).foregroundStyle(Color.textSecondary)
            card
            HStack(spacing: 8) {
                Text(share.map { AppConfig.siteOrigin + sharePath($0.id) } ?? "Creating link…")
                    .font(.footnote).foregroundStyle(share == nil ? Color.textMuted : Color.textSecondary)
                    .lineLimit(1).truncationMode(.middle)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 14).frame(height: 44)
                    .background(Color.white.opacity(0.04), in: Capsule())
                    .overlay(Capsule().strokeBorder(Color.borderGlass, lineWidth: 1))
                Button { copyLink() } label: {
                    Label(copied ? "Copied" : "Copy link", systemImage: copied ? "checkmark" : "link")
                        .font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                        .padding(.horizontal, 16).frame(height: 44)
                        .background(Color.brandPinkStrong, in: Capsule())
                }
                .disabled(share == nil)
            }
            Button { sharing = true } label: { Label("More options", systemImage: "square.and.arrow.up") }
                .buttonStyle(.secondary)
                .disabled(share == nil)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 16)
        .presentationDetents([.height(520)])
        .presentationDragIndicator(.hidden)
        .presentationBackground(Color.bgSecondary)
        .onAppear {
            Analytics.screen("share")
            if let grid = model.grid { flow.prepare(grid: grid, projectId: model.cloudVersion != nil ? model.projectId : nil) }
        }
        .sheet(isPresented: $sharing) {
            if let share, let copy {
                ActivityView(items: [copy.postText, URL(string: shareUrl(origin: AppConfig.siteOrigin, id: share.id, source: .shareSheet))!])
                    .onAppear { Analytics.track(.share(method: ShareSource.shareSheet.rawValue, shareId: share.id)) }
            }
        }
    }

    @ViewBuilder
    private var card: some View {
        ZStack {
            Color.black.opacity(0.4)
            if let share, let image = UIImage(data: share.card) {
                Image(uiImage: image).resizable().scaledToFill()
            } else if flow.state == .error {
                VStack(spacing: 10) {
                    Text("Couldn't create the share link.").font(.subheadline).foregroundStyle(Color.textSecondary)
                    Button("Try again") { if let grid = model.grid { flow.prepare(grid: grid, projectId: model.projectId) } }
                        .font(.subheadline.weight(.medium)).foregroundStyle(.white)
                }
            } else {
                VStack(spacing: 10) {
                    ProgressView()
                    Text("Creating your link…").font(.subheadline).foregroundStyle(Color.textSecondary)
                }
            }
        }
        .aspectRatio(CGFloat(ShareCard.width) / CGFloat(ShareCard.height), contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.borderGlass, lineWidth: 1))
        .accessibilityLabel(copy?.imageAlt ?? "Share card")
    }

    private func copyLink() {
        guard let share else { return }
        UIPasteboard.general.string = shareUrl(origin: AppConfig.siteOrigin, id: share.id, source: .copyLink)
        copied = true
        Analytics.track(.share(method: ShareSource.copyLink.rawValue, shareId: share.id))
        Task {
            try? await Task.sleep(for: .seconds(2))
            copied = false
        }
    }
}
