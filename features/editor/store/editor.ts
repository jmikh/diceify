// Cross-store transitions that do not belong to any single store. None of these touch persistence
// (autosave/draft) — callers `markClean()` after a load so the just-loaded state is not written back.

import type { ProjectDocument } from '@/core/dice'
import type { ProjectRecord } from '@/lib/supabase/projects'
import { useDerivedStore } from './useDerivedStore'
import { DEFAULT_PROJECT_NAME, replaceDocument, useDocumentStore } from './useDocumentStore'
import { useEditorUiStore } from './useEditorUiStore'
import { useProjectStore } from './useProjectStore'

/** A new photo: crop and progress go, tune params stay, on to the crop step. */
export function uploadImage(blob: Blob): void {
  useProjectStore.getState().setImage(URL.createObjectURL(blob), blob)
  useDocumentStore.getState().resetForNewImage()
  useDocumentStore.temporal.getState().clear()
  useDerivedStore.getState().reset(null)
  useEditorUiStore.getState().setStep('crop')
}

/** A project row + its image become the current state (no history, derived grid seeded from the document). */
export function loadProjectIntoEditor(record: ProjectRecord, blob: Blob): void {
  const project = useProjectStore.getState()
  replaceDocument(record.document, record.name)
  project.setImage(URL.createObjectURL(blob), blob)
  project.setProjectId(record.id)
  project.setCloudVersion(record.cloudVersion)
  project.setLastSaved(new Date(record.updatedAt))
  project.setSaveStatus('idle')
  useEditorUiStore.getState().setStep(record.document.step)
}

/** The anonymous draft becomes the current state (no project). */
export function loadDraftIntoEditor(doc: ProjectDocument, name: string, blob: Blob): void {
  replaceDocument(doc, name)
  useProjectStore.getState().setImage(URL.createObjectURL(blob), blob)
  useEditorUiStore.getState().setStep(doc.step)
}

/** Detach from the current project; the document and image stay (they become a draft). */
export function clearProject(): void {
  const project = useProjectStore.getState()
  project.setProjectId(null)
  project.setCloudVersion(null)
  project.setLastSaved(null)
  project.setSaveStatus('idle')
}

/** Back to an empty editor (project id is the caller's business, see `clearProject`). */
export function resetEditor(name: string = DEFAULT_PROJECT_NAME): void {
  useProjectStore.getState().setImage(null, null)
  useDocumentStore.getState().resetAll()
  useDocumentStore.getState().setName(name)
  useDocumentStore.temporal.getState().clear()
  useDerivedStore.getState().reset(null)
  useEditorUiStore.getState().setStep('upload')
}
