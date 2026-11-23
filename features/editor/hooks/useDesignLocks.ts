import { useMemo } from 'react'
import { designLocks, type DesignLock } from '@/core/billing'
import { useEntitlements } from '@/features/account/useUser'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'

/** The open design's settings the user's plan does not include (the design paywall); empty = no watermark. */
export function useDesignLocks(): DesignLock[] {
  const ent = useEntitlements()
  const colorMode = useDocumentStore((s) => s.dice.colorMode)
  const numRows = useDocumentStore((s) => s.dice.numRows)
  return useMemo(() => designLocks(ent, { colorMode, numRows }), [ent, colorMode, numRows])
}
