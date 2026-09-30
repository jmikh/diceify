# Step C3 — Projects, images, drafts on Supabase

Scope (tiered plan): `lib/supabase/{projects,storage,keepalive}.ts`, `features/editor/store/{autosave,draft}.ts`, `useProjects`
(replaces `useProjectManager`), `useEditorBootstrap` on `useUser`, immutable-image UI, `downscaleForUpload` on upload,
`sonner` toasts, `idb-keyval` draft image; Prisma + `app/api/**` deleted. Not in scope: billing (D1/D2), Sentry (E2).

## Repo state found

- `hooks/useAutosave.ts` (B3) still maps the document onto Prisma columns (`toLegacyProjectFields`) and PATCHes
  `/api/projects/[id]` (401 since C2); the anonymous draft is `editorState` (`{ doc, name }`) + `editorImage` (data URL)
  in localStorage; `beforeunload` → `sendBeacon`. `useProjectManager` does list/create/delete/load over `fetch` + `alert`.
- `useEditorBootstrap` is four interleaved effects over `useSession`-era assumptions; `ProjectSelector` renames with its own
  PATCH; `ProjectSelectionModal` keeps a Prisma-shaped `Project` DTO; `UploadMain` reads the file as a data URL and calls
  `persistImage`. `useDicePipeline` keys its stage-A cache on `imageSrc.length` — fine for data URLs, wrong for object URLs
  (two `blob:` URLs have the same length).
- `app/api/stripe/webhook` imports `lib/prisma` (5 `prisma.user.*` calls) — cannot survive the Prisma removal.
- storage-js 2.117: `StorageApiError { status (HTTP), statusCode (body statusCode|code), code }` — the body code is what
  C1 found (`400` HTTP with `statusCode: '403'|'404'|'415'`). `.remove()` of a missing object is `200 []`.
- `image_path`/`owner_id` are updatable at the DB level (C1 finding).

## Data access (`lib/supabase/`)

```ts
// projects.ts  (types from database.types.ts; camelCase records)
interface ProjectSummary { id; name; totalDice; completedDice; percentComplete; cloudVersion; createdAt; updatedAt }
interface ProjectRecord extends ProjectSummary { document: ProjectDocument; imagePath: string }
class ProjectLimitError extends Error { current: number | null; limit: number | null }
class NotSignedInError extends Error
parseProjectLimit(details: unknown): { current; limit } | null        // pure: JSON string (PostgREST) or object; else null
toProjectError(error: PostgrestError): Error                            // P0001 + 'PROJECT_LIMIT' → ProjectLimitError, else the PostgrestError
listProjects(): Promise<ProjectSummary[]>                               // summary columns, updated_at desc
getProject(id): Promise<ProjectRecord | null>                           // maybeSingle → migrateDocument(row.document)
createProject({ name, document, imageBlob }): Promise<ProjectRecord>    // id = crypto.randomUUID(); path = `${uid}/${id}/original.jpg`; upload (upsert:false) → insert; insert failure → remove object, rethrow mapped
saveProject(id, { name, document, expectedVersion }): Promise<{ ok: true; cloudVersion } | { ok: false; conflict: ProjectRecord | null }>
                                                                        // update(...).eq('id').eq('cloud_version', expected).select('cloud_version').maybeSingle(); null → getProject(id) (null = deleted elsewhere)
deleteProject(id): Promise<void>                                        // delete().eq('id').select('image_path').maybeSingle() → removeProjectImage(path) (NOT_FOUND ignored)
documentJson(doc): Json                                                 // JSON round trip (drops undefined, satisfies the Json type)
```
No `renameProject`: the name is part of the autosave snapshot (`setName` → autosave). `total_dice`/`completed_dice` come from
`documentStats(doc)` on every write. `createProject` reads the user id from `auth.getSession()` (local, no network).

```ts
// storage.ts
PROJECT_IMAGES_BUCKET = 'project-images'; projectImagePath(userId, projectId)
class ProjectStorageError extends Error { code: 'NOT_FOUND'|'FORBIDDEN'|'UNSUPPORTED_TYPE'|'TOO_LARGE'|'EXISTS'|'UNKNOWN'; status }
mapStorageError(error: { statusCode?; status?; message; code? }): ProjectStorageError   // pure, keyed on body statusCode, HTTP status as fallback
uploadProjectImage(path, blob), downloadProjectImage(path): Promise<Blob>, removeProjectImage(path)   // NOT_FOUND swallowed on remove
```

```ts
// keepalive.ts — only for pagehide/visibilitychange; supabase-js has no keepalive option
patchProjectKeepalive(id, expectedVersion, body: { name, document, total_dice, completed_dice }, accessToken): Promise<number | null>
// fetch(`${url}/rest/v1/projects?id=eq.${id}&cloud_version=eq.${v}&select=cloud_version`, { method:'PATCH', keepalive:true,
//   headers:{ apikey, Authorization, 'Content-Type', Prefer:'return=representation' } }) → new cloud_version, null on CAS miss
```
The access token is cached synchronously by `useAutosave()` from `onAuthStateChange` (INITIAL_SESSION/SIGNED_IN/TOKEN_REFRESHED);
`getSession()` takes the auth lock, which is not safe to await inside `pagehide`.

### Migration `..._image_path_immutable.sql` (design change, C1 follow-up)

`projects_image_path_immutable` before-update trigger raises `IMAGE_PATH_IMMUTABLE` (errcode `P0001`) when `image_path` or
`owner_id` changes. The client never sends either on update; this makes the "immutable per project" decision a DB guarantee.

## Drafts (`features/editor/store/draft.ts`)

- `DRAFT_KEY = 'diceify.draft'` → localStorage `{ doc, name, savedAt }`; `DRAFT_IMAGE_KEY = 'diceify.draftImage'` → idb-keyval `Blob`.
- `readDraft(): Draft | null` (sync). Legacy migration inside: no new key + `editorState` present → parse (`{ doc, name }` from B3 or
  an older snapshot, merging `editorBuildProgress` first) → `migrateDocument` → written under the new key; legacy keys removed
  either way. Corrupt JSON / `DocumentError` → `console.warn`, keys removed, `null`.
- `readDraftImage(): Promise<Blob | null>`: idb-keyval `get`; miss + legacy `editorImage` data URL → `fetch(dataUrl).blob()` → `set`
  → remove the legacy key. `writeDraft(doc, name)` (sync), `writeDraftImage(blob)`, `clearDraft()` (both keys + legacy keys).
  Every localStorage/IDB access is try/caught (private mode, quota) and degrades to "no draft".

## Autosave (`features/editor/store/autosave.ts` + `hooks/useAutosave.ts`)

```ts
type SavePlan = 'skip' | 'draft' | 'cloud'
planSave({ boot, projectId, hasImage, changed }): SavePlan   // pure, tested: boot≠ready|!changed → skip; projectId → cloud; hasImage → draft; else skip
snapshot(): { doc: buildDocument(), name }
markClean()            // lastSavedJson = current snapshot; cancels the timer; 'dirty' → 'idle'
flushSave(): Promise<void>   // cancel timer, await an in-flight save, persist now (unmount, before sign-in redirect, before switching/creating)
flushKeepalive(): void       // pagehide / visibilitychange=hidden, synchronous: draft → writeDraft; cloud → patchProjectKeepalive
```

State machine (module-level, like recordio's `useScreenshotStore` subscription + `cloudProjectService.saveInFlight`):

1. Subscriptions (document store, ui `step`, derived `gridSize`) → `check()`: `planSave` ≠ skip → cloud: `saveStatus='dirty'`;
   restart the 1.5 s timer → `persist()`.
2. `persist()`: `draft` → `writeDraft`, `lastSavedJson = json`. `cloud` with a save in flight → `pending = true` and return
   (the running save re-runs `persist()` once when done). Otherwise `saving` → `saveProject(id, { name, document, expectedVersion: cloudVersion })`:
   - `ok` → `setCloudVersion`, `lastSavedJson = json`, `saved`, `lastSaved = now`;
   - conflict with a row → `replaceDocument(conflict.document, conflict.name)`, `setStep(doc.step)`, `setCloudVersion`, `markClean()`,
     `toast('This project was changed elsewhere. Reloaded the latest version.')`;
   - conflict `null` (deleted elsewhere) → `clearProject()`, the work continues as a local draft (`writeDraftImage(imageBlob)` so a
     reload keeps it), `toast.error('This project was deleted elsewhere. Your work is kept as a local draft.')`, list refreshed;
   - throw → `error`; `lastSavedJson` unchanged so the next change (or flush) retries.
   The project id is re-checked after the await: a save that finished for a project that is no longer current is ignored.
3. `flushKeepalive()` sends the current snapshot when it differs from `lastSavedJson` and optimistically marks it saved; when the
   page survives (tab switch), the PATCH response updates `cloudVersion` (or, on a CAS miss, invalidates `lastSavedJson` so the next
   ordinary save hits the conflict path).

`useAutosave()` mounts the subscriptions, the `pagehide` + `visibilitychange` listeners and the token cache; unmount flushes.
`saveStatus` semantics unchanged (`idle|dirty|saving|saved|error`, `formatSaveStatus`).

## Stores

- `useProjectStore` gains `cloudVersion: number | null`, `imageBlob: Blob | null` (kept for loaded projects too — it is what a
  "deleted elsewhere" fallback and a future "duplicate" need, and the browser already holds the bytes behind the object URL);
  `setImage(src, blob)` revokes the previous `blob:` URL; `setCloudVersion`. `ProjectSummary` comes from `lib/supabase/projects`.
- `store/editor.ts` composites: `uploadImage(blob)` (object URL + `resetForNewImage` + history clear + step crop),
  `loadProjectIntoEditor(record, blob)`, `loadDraftIntoEditor(draft, blob)`, `clearProject()`, `resetEditor()`.
- `useDicePipeline` stage-A cache key = `imageSrc` (object URLs are short and unique) instead of `imageSrc.length`.

## Hooks

`useProjects()` → `{ projects, refresh, load(id), createFromDraft(name), startNewProject(name?), remove(id) }`, errors via
`toast.error` (no `alert`):
- `load`: `flushSave` → `getProject` (null → toast "Project not found") → `downloadProjectImage` → `loadProjectIntoEditor` →
  `markClean` → `clearDraft` → `closeModal`. `DocumentError` → toast "couldn't open".
- `createFromDraft(name)`: requires `imageBlob` and no project; `flushSave` → `createProject({ name, document: buildDocument(), imageBlob })`
  → `setName`, `setProjectId`, `setCloudVersion`, `markClean`, `clearDraft`, `closeModal`, `refresh`. `ProjectLimitError` → `refresh()`
  + `openModal('projects')` (its existing capacity banner is the limit UI) + `toast.error('Project limit reached (n/m)')`.
- `startNewProject(name?)`: `flushSave` → `clearProject` → `resetEditor` → `setName(name ?? default)` → step upload (the next upload creates it).
- `remove(id)`: `deleteProject` → `refresh`; current project → `clearProject` + `resetEditor`.

`useEditorBootstrap()` — one effect, runs once `status !== 'loading'`, reads `window.location.search` once:
```
all:    hydrate draft (anonymous; back from OAuth with ?restored=true; or left over from a failed save — a draft only
        exists in those cases and opening a project would discard it, so it is always offered)
anon:   ?project → strip
authed: ?project → load or toast + strip; no project yet → listProjects → draft image ? openModal('projects')
        : projects[0] ? load : openModal('projects')
then:   markClean(); boot='ready'; router.replace('/editor[?project=id]')
```
A second effect keeps `?project=` in sync with `projectId` after boot; a third resets the editor when the user signs out
with a project open (the row is no longer theirs to save). The draft is cleared by `load`/`createFromDraft`. The projects
modal is dismissable (`onClose`) — an explorer at the limit with a draft must be able to keep working on it.

## Immutable-image UI

- `UploadMain.onDrop`: `downscaleForUpload(file, 2048, 0.85)` → `uploadImage(blob)` → `writeDraftImage(blob)`; a project was open →
  `startNewProject()` first (flush, detach). Signed in → `createFromDraft(name)` right away ("upload photo = create project", plan
  Images decision); the explorer at the limit gets the projects modal + toast and keeps working on the local draft.
  The overlay button reads "Start new project" while a project is open, "Change image" for a draft.
- `ProjectSelector` rename = `setName` (autosave). `ProjectSelectionModal` uses `ProjectSummary`; `onCreateNew(name)` = draft image
  ? `createFromDraft` : `startNewProject`. `EditorSignInModal`/`ProFeatureModal` flush with `flushSave` before the OAuth redirect.
- `<Toaster theme="dark" position="bottom-center" />` mounted once in `EditorScreen`.

## Deleted

`app/api/projects/**`, `app/api/stripe/webhook/route.ts` + `lib/stripe.ts` (imports Prisma; D1 rebuilds the webhook as an edge
function — `app/api/` is now empty and gone), `lib/api/legacy-auth.ts`, `lib/prisma.ts`, `prisma/`, `hooks/useProjectManager.ts`,
the old `hooks/useAutosave.ts` engine (`persistImage`, `hydrateFromLocalDraft`, `buildProjectPayload`, `toLegacyProjectFields`,
`flushDraftForSignIn`, `clearLocalDraft`). Packages: `prisma`, `@prisma/client` removed; `idb-keyval`, `sonner` added (`stripe` stays
until D1 per plan).

## Tests

- `store/draft.test.ts` (in-memory `localStorage` + `vi.mock('idb-keyval')`): round trip; legacy `{doc,name}` and legacy snapshot +
  `editorBuildProgress` migrate and the keys are removed; corrupt JSON ignored; legacy data-URL image → Blob in IDB.
- `store/autosave.test.ts`: `planSave` table. `lib/supabase/projects.test.ts`: `parseProjectLimit`, `toProjectError`;
  `lib/supabase/storage.test.ts`: `mapStorageError`.
- `lib/supabase/projects.integration.test.ts` (opt-in `SUPABASE_TEST=1`, service-role key): admin user → sign in → `createProject`
  with a tiny JPEG → object downloadable at the path → `saveProject` ok (version 2) → stale version → conflict with the current row →
  second `createProject` → `ProjectLimitError {1,1}` → `image_path` update rejected → `deleteProject` → row gone, download fails NOT_FOUND.

## Verification

1. `npm run db:start && npm run db:reset` (new migration); `SUPABASE_TEST=1 SUPABASE_SERVICE_ROLE_KEY=… npx vitest run lib/supabase/projects.integration.test.ts`.
2. `git grep -n "prisma\|/api/projects\|editorState\|editorImage\|persistImage" -- app components lib features core` → only `draft.ts` legacy keys.
3. `rm -rf .next && npm run typecheck && npm test && npm run lint && npm run build` → 0.
4. Manual (user): anonymous draft survives reload; sign in → "save as project" uploads + inserts; two tabs editing → second reloads
   with toast; close tab mid-edit → change persisted; list/create/delete/rename; explorer second project → limit modal; storage object
   at `{uid}/{id}/original.jpg` ≤ 2048px; project delete removes the object.
