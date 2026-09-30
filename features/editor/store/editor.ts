// Cross-store transitions that do not belong to any single store.

import { useDerivedStore } from './useDerivedStore'
import { useDocumentStore } from './useDocumentStore'
import { useEditorUiStore } from './useEditorUiStore'
import { useProjectStore } from './useProjectStore'

/** A new photo: crop and progress go, tune params stay, on to the crop step. */
export function uploadImage(src: string): void {
  useProjectStore.getState().setImageSrc(src)
  useDocumentStore.getState().resetForNewImage()
  useDocumentStore.temporal.getState().clear()
  useDerivedStore.getState().reset(null)
  useEditorUiStore.getState().setStep('crop')
}

/** Back to an empty editor (project id and name are the caller's business). */
export function resetEditor(): void {
  useProjectStore.getState().setImageSrc(null)
  useDocumentStore.getState().resetAll()
  useDocumentStore.temporal.getState().clear()
  useDerivedStore.getState().reset(null)
  useEditorUiStore.getState().setStep('upload')
}
