'use client'

import { Zap } from 'lucide-react'
import { track } from '@/lib/analytics'
import { useUser } from '@/features/account/useUser'
import { useGate } from '@/features/editor/hooks/useGate'
import { primaryButton } from '../common/ui'

/**
 * The header's upgrade button, in the same spot on every step: right before the account control, so Share (absent on
 * crop) never moves it. Hidden on a paid plan, and while the profile loads (no flash for Pro users). `compact` = the
 * mobile top bar.
 */
export default function UpgradeControl({ compact = false }: { compact?: boolean }) {
  const { status } = useUser()
  const { ent, gate } = useGate()

  if (status === 'loading' || ent.isPro) return null

  const upgrade = () => {
    track('click_upgrade', { source: 'editor_header' })
    gate(false, 'upgrade')
  }

  return (
    <button onClick={upgrade} className={`${primaryButton} flex-shrink-0 ${compact ? 'h-9 px-3.5 text-[13px]' : 'h-10 px-4 text-sm'}`}>
      {!compact && <Zap size={15} />}
      Upgrade
    </button>
  )
}
