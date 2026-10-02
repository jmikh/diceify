'use client'

import { Share2 } from 'lucide-react'
import { useGate } from '@/features/editor/hooks/useGate'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { ghostButton } from '../common/ui'

/**
 * Header action on the tune and build steps: signed out → the sign-in modal, signed in → the share modal.
 * Free on every plan. `compact` = icon only (mobile top bar).
 */
export default function ShareButton({ compact = false }: { compact?: boolean }) {
  const step = useEditorUiStore((state) => state.step)
  const openModal = useEditorUiStore((state) => state.openModal)
  const hasGrid = useDerivedStore((state) => state.grid !== null)
  const { gate, user } = useGate()

  if (step === 'crop') return null

  const onClick = () => {
    if (gate(user !== null, 'share', { signInMessage: 'Sign in to share your dice art.' })) openModal('share')
  }

  return (
    <button
      onClick={onClick}
      disabled={!hasGrid}
      aria-label="Share"
      className={`${ghostButton} flex-shrink-0 ${compact ? 'h-9 w-9' : 'h-10 px-4 text-sm'}`}
    >
      <Share2 size={compact ? 16 : 15} />
      {!compact && 'Share'}
    </button>
  )
}
