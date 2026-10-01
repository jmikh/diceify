'use client'

import { ImagePlus, Info, LogIn } from 'lucide-react'
import { useCurrentThumbnail } from '@/features/editor/hooks/useCurrentThumbnail'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { ghostButton, primaryButton } from '../common/ui'
import ProjectThumb from './ProjectThumb'
import SaveStatusLine from './SaveStatusLine'
import { PopoverHeader } from './PopoverHeader'

/** Signed-out switcher: the one project kept in this browser, sign in to save it, or start over. */
export default function GuestProjectMenu({ onClose }: { onClose: () => void }) {
  const name = useDocumentStore((state) => state.name)
  const thumbnail = useCurrentThumbnail()
  const openStart = useEditorUiStore((state) => state.openStart)
  const openModal = useEditorUiStore((state) => state.openModal)

  return (
    <>
      <PopoverHeader title="Current project" />
      <div className="p-4 flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <ProjectThumb src={thumbnail} size={56} />
          <span className="flex flex-col gap-1 min-w-0">
            <span className="text-[15px] font-semibold text-white truncate">{name}</span>
            <SaveStatusLine long className="text-xs text-white/60" />
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-white/70">
          While you’re signed out, one project is kept in this browser. Sign in to save it to your account and open it on any device.
        </p>
        <button
          onClick={() => {
            onClose()
            openModal('signIn', { message: 'Sign in to save this project to your account' })
          }}
          className={`${primaryButton} h-11 text-sm`}
        >
          <LogIn size={17} />
          Sign in to save
        </button>
      </div>
      <div className="px-4 pt-3 pb-4 border-t border-white/[0.08] flex flex-col gap-2">
        <button
          onClick={() => {
            openStart()
            onClose()
          }}
          className={`${ghostButton} h-10 rounded-xl text-sm`}
        >
          <ImagePlus size={16} />
          New project
        </button>
        <p className="flex items-start gap-2 text-xs leading-snug text-white/60">
          <Info size={14} className="mt-px flex-shrink-0" />
          Replaces the current project in this browser.
        </p>
      </div>
    </>
  )
}
