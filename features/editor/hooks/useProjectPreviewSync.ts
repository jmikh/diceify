import { useEffect, useRef } from 'react'
import { useUser } from '@/features/account/useUser'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import type { Thumbnail } from '@/lib/image/decode'
import { reportError } from '@/lib/report-error'
import { projectPreviewPath, uploadProjectPreview } from '@/lib/supabase/storage'

const PREVIEW_DEBOUNCE_MS = 2000

/**
 * Keeps the current project's thumbnail (`preview.jpg`) in step with its cropped photo: once the pipeline's thumbnail
 * has been stable for a moment it is stored and put into the list's `previews`. Each project is written at most once
 * per distinct thumbnail this session. Mounted once in the editor page; drafts have no stored thumbnail.
 */
export function useProjectPreviewSync() {
  const userId = useUser().user?.id
  const projectId = useProjectStore((state) => state.projectId)
  const thumbnail = useDerivedStore((state) => state.thumbnail)
  const writtenRef = useRef(new Map<string, Thumbnail>())

  useEffect(() => {
    if (!userId || !projectId || !thumbnail || writtenRef.current.get(projectId) === thumbnail) return
    const timer = setTimeout(async () => {
      try {
        await uploadProjectPreview(projectPreviewPath(userId, projectId), thumbnail.blob)
        writtenRef.current.set(projectId, thumbnail)
        useProjectStore.getState().setPreview(projectId, thumbnail.dataUrl)
      } catch (error) {
        reportError(error, { where: 'project-preview', extra: { projectId } })
      }
    }, PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [userId, projectId, thumbnail])
}
