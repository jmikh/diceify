'use client'

import type { ReactNode } from 'react'
import { AlertCircle, CloudCheck, CloudOff, Loader2, Monitor } from 'lucide-react'
import { useUser } from '@/features/account/useUser'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { formatSaveStatus } from './saveStatus'

/**
 * Where the open project lives and whether it is saved: "In this browser" (signed out), "Not saved to account"
 * (signed-in draft), else the cloud autosave status. `long` uses the full "Saved 2 minutes ago" wording.
 */
export default function SaveStatusLine({ long = false, className = '' }: { long?: boolean; className?: string }) {
  const { user } = useUser()
  const projectId = useProjectStore((state) => state.projectId)
  const status = useProjectStore((state) => state.saveStatus)
  const lastSaved = useProjectStore((state) => state.lastSaved)

  const line = (icon: ReactNode, text: string) => (
    <span className={`flex items-center gap-1.5 whitespace-nowrap ${className}`} title={projectId ? formatSaveStatus(status, lastSaved) : undefined}>
      {icon}
      {text}
    </span>
  )

  if (!user) return line(<Monitor size={12} />, long ? 'Saved in this browser' : 'In this browser')
  if (!projectId) return line(<CloudOff size={12} />, 'Not saved to account')
  if (status === 'saving' || status === 'dirty') return line(<Loader2 size={12} className="animate-spin" />, 'Saving…')
  if (status === 'error') return line(<AlertCircle size={12} className="text-red-400" />, 'Save failed')
  return line(
    // Re-mounted per save so the green flash replays
    <CloudCheck key={lastSaved?.getTime() ?? 0} size={12} className={`text-[var(--accent-green)] ${lastSaved ? 'save-flash' : ''}`} />,
    long ? formatSaveStatus(status, lastSaved) : lastSaved ? 'Saved' : 'Not saved yet',
  )
}
