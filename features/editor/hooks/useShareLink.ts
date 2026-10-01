import { useEffect, useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import type { DiceGrid } from '@/core/dice'
import { renderShareCard } from '@/lib/image/shareCard'
import { reportError } from '@/lib/report-error'
import { createShare } from '@/lib/supabase/shares'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'

// The share flow behind ShareModal: render the social card for the current grid, create the share, and keep it so
// opening the modal again without changing the art reuses the same link (memory only; keyed on the grid object,
// which the pipeline replaces whenever the art changes). Concurrent calls for one grid share one request.

export interface PreparedShare {
  id: string
  /** Object URL of the uploaded card, for the modal's preview. */
  cardUrl: string
}

export type ShareLinkState =
  | { status: 'preparing' }
  | { status: 'ready'; share: PreparedShare }
  | { status: 'error' }

let current: { grid: DiceGrid; promise: Promise<PreparedShare> } | null = null

function prepareShare(grid: DiceGrid, projectId: string | null): Promise<PreparedShare> {
  if (current?.grid === grid) return current.promise

  const promise = (async () => {
    const image = await renderShareCard(grid)
    const id = await createShare({ projectId, cols: grid.width, rows: grid.height, image })
    sendGAEvent('event', 'share_create', { share_id: id, total_dice: grid.width * grid.height })
    return { id, cardUrl: URL.createObjectURL(image) }
  })()

  const previous = current
  current = { grid, promise }
  previous?.promise.then((share) => URL.revokeObjectURL(share.cardUrl), () => {})
  promise.catch((error) => {
    reportError(error, { where: 'share-create' })
    // A failure is not cached: the next attempt creates a new share
    if (current?.promise === promise) current = null
  })
  return promise
}

/** The share for the current art, prepared while `active` (the modal is open). `retry` after an error. */
export function useShareLink(active: boolean): { state: ShareLinkState; retry: () => void } {
  const grid = useDerivedStore((state) => state.grid)
  const projectId = useProjectStore((state) => state.projectId)
  const [state, setState] = useState<ShareLinkState>({ status: 'preparing' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!active || !grid) return
    let cancelled = false
    setState({ status: 'preparing' })
    prepareShare(grid, projectId).then(
      (share) => !cancelled && setState({ status: 'ready', share }),
      () => !cancelled && setState({ status: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [active, grid, projectId, attempt])

  return { state, retry: () => setAttempt((n) => n + 1) }
}
