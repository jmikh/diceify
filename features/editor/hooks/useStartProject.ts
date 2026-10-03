import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/features/account/useUser'
import { track } from '@/lib/analytics'
import { downscaleForUpload } from '@/lib/image/decode'
import { reportError } from '@/lib/report-error'
import { writeDraftImage } from '@/features/editor/store/draft'
import { uploadImage } from '@/features/editor/store/editor'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { saveDraftAsProject, startNewProject } from './useProjects'

/**
 * A photo starts a new project: the current one is flushed and detached, the editor resets (default params and
 * name), the photo becomes the draft image and — signed in — the draft is saved as a project right away. Shared by
 * the Start screen's dropzone and the homepage hand-off (`useEditorBootstrap`). False after a toast when the file
 * cannot be read; the editor is left reset (the Start screen).
 */
export async function startProjectFromFile(file: File, signedIn: boolean): Promise<boolean> {
  try {
    const blob = await downscaleForUpload(file)
    await startNewProject()
    uploadImage(blob)
    await writeDraftImage(blob)
    if (signedIn) await saveDraftAsProject(useDocumentStore.getState().name)
    track('photo_uploaded', { file_type: file.type, file_size: file.size })
    return true
  } catch (error) {
    reportError(error, { where: 'upload', extra: { type: file.type, size: file.size } })
    toast.error('Could not read that image. Please try another file.')
    return false
  }
}

/** `startProjectFromFile` for the UI, with a busy flag while the photo is being prepared. */
export function useStartProject() {
  const { user } = useUser()
  const [isProcessing, setIsProcessing] = useState(false)

  const start = useCallback(async (file: File) => {
    setIsProcessing(true)
    try {
      await startProjectFromFile(file, user !== null)
    } finally {
      setIsProcessing(false)
    }
  }, [user])

  return { start, isProcessing }
}
