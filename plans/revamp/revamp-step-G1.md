# Step G1 — Start flow, 3-step model, thumbnails

Scope (plan, Phase G): upload stops being a step; a Start screen creates projects; signed-in arrivals save a waiting
draft as a project; project thumbnails. The editor shell itself is G2 (desktop) and G3 (mobile) — G1 only swaps the
upload step for the Start screen inside the current shell and points the old header's "create" at it.

Design: https://claude.ai/artifact/NMgpR5oNZQ5oaDK3ePbDVg (artboards "Start" and "Project switcher").

## Step model

- `steps.ts`: `STEPS = ['crop', 'tune', 'build']`, `Step = DocumentStep` (the persisted step; nothing to map any more).
  `canAdvance(step, { hasCrop })`; `canEnter(step, { hasCrop })` for the G2 tabs (crop always, tune/build with a crop).
- `useEditorUiStore`: default step `crop`; `startOpen` + `openStart()`/`closeStart()` (the Start screen over a loaded
  project: "New project" from the switcher); `'projects'` leaves the modal enum.
- What is on screen: no image → Start; image + `startOpen` → Start (with "back to the project"); else the editor.
- `buildDocument` loses the `'upload' → 'crop'` mapping; `uploadImage` closes the Start screen; `resetEditor` lands on `crop`.

## Start screen (`components/start/`)

- `StartScreen`: title + copy, a back link when a project is loaded, then by state:
  - signed out with a current project → current-project card (Continue) and the dropzone warns that a new photo
    replaces it (Sign in link);
  - signed in with an unsaved draft (a failed save) → draft card (Save to account / Keep editing);
  - dropzone (`PhotoDropzone`, react-dropzone);
  - lock note ("the photo stays with its project");
  - signed in with projects → `ProjectGrid` (thumbnail, name, `percentComplete`, updated date; delete with a confirm).
- `useStartProject()`: downscale → `startNewProject()` (flush + detach + reset: a new photo is a new project with
  default params and name) → `uploadImage` → draft image → `createFromDraft` when signed in. Replaces `UploadMain`.
- Deleted: `components/upload/*`, `ProjectSelectionModal`.

## Arrival (`useEditorBootstrap`)

- Signed in: `?project=` opens it; otherwise a waiting draft (signed in from the editor, or a failed save) is saved as a
  project right away (`saveDraftAsProject`, exported from `useProjects`; a failure keeps it a draft); no draft → most
  recent project; none → Start.

## Thumbnails

- Object `{uid}/{projectId}/preview.jpg` next to the original (`projectPreviewPath`, `previewPathFor(imagePath)`),
  same bucket/RLS (insert/update/select policies already cover the owner folder; JPEG is an allowed type).
- `useProjectPreviewSync` (mounted in the editor): when the current project's `previewUrl` changes, after 2 s,
  `makeThumbnail` (≤192 px JPEG, `lib/image/decode.ts`) → `uploadProjectPreview` (upsert) → `setPreview(id, dataUrl)`.
  Per project only when the preview changed since the last upload this session.
- `refreshProjects` also fetches `previews` (one `createSignedUrls` call, 1 h; missing objects are simply absent;
  a failure leaves the list without thumbnails). `ProjectSummary` gains `imagePath` (needed for the path).
- `deleteProject` removes `original.jpg` and `preview.jpg`.
- Live project: the UI shows the in-memory preview (or the photo before the first preview), never the stored one.
- Legacy-migrated projects get a thumbnail the first time they are opened.

## Project limits removed (user decision mid-step, 2026-10-01: "unlimited for every plan")

- Migration `20261001114734_drop_project_limit.sql`: drops `projects_enforce_limit`, `enforce_project_limit()`,
  `project_limit(text)`; `effective_plan` stays (mirror of `entitlements.ts`, support queries). Applied locally with
  `supabase migration up --local` (no `db reset`: keeps the F1 rehearsal data); `db:types` regenerated.
- `PlanLimits`/`Entitlements` lose `projectLimit`; `ProjectLimitError`/`parseProjectLimit` deleted (`toProjectError`
  only wraps); limit UI gone (Start screen, project menu, LimitReachedModal bullet); pricing copy "Unlimited projects in
  the cloud" on every card; `migrate-from-prisma.ts` loses `--no-ignore-limit`, the trigger toggle and `skipped-over-limit`.

## Verification

`npm run typecheck && npm test && npm run lint && npm run build` green; unit tests: step machine, `previewPathFor`.
