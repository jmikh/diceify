'use client'

import { useCallback, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useUser } from '@/features/account/useUser'
import { useCurrentThumbnail } from '@/features/editor/hooks/useCurrentThumbnail'
import { useDismiss } from '@/features/editor/hooks/useDismiss'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { popover } from '../common/ui'
import GuestProjectMenu from './GuestProjectMenu'
import ProjectMenu from './ProjectMenu'
import ProjectThumb from './ProjectThumb'
import SaveStatusLine from './SaveStatusLine'

/**
 * The open project as a pill (thumbnail, name, save status) and its popover: the project list (signed in) or the
 * current-project card (signed out).
 */
export default function ProjectSwitcher({ compact = false }: { compact?: boolean }) {
  const { user } = useUser()
  const name = useDocumentStore((state) => state.name)
  const thumbnail = useCurrentThumbnail()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex items-center gap-2.5 min-w-0 ${compact ? 'h-10' : 'h-11'} pl-[5px] pr-2.5 rounded-[14px] border text-left transition-colors ${open
          ? 'border-accent-pink/50 bg-white/[0.08]'
          : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
          }`}
      >
        <ProjectThumb src={thumbnail} size={compact ? 28 : 32} />
        <span className="flex flex-col gap-0.5 min-w-0 leading-tight">
          <span className={`text-sm font-semibold text-white truncate ${compact ? 'max-w-[96px]' : 'max-w-[220px]'}`}>{name}</span>
          <SaveStatusLine className="text-[11px] text-white/60" />
        </span>
        <ChevronDown size={16} className={`text-white/60 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="dialog" aria-label="Projects" className={`absolute left-0 top-full mt-2 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-[18px] overflow-hidden flex flex-col ${popover}`}>
          {!user ? (
            <GuestProjectMenu onClose={close} />
          ) : (
            <ProjectMenu onClose={close} />
          )}
        </div>
      )}
    </div>
  )
}
