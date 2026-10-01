'use client'

import { Monitor, CloudOff } from 'lucide-react'
import { useUser } from '@/features/account/useUser'
import { STEP_LABELS } from '@/features/editor/steps'
import { useCurrentThumbnail } from '@/features/editor/hooks/useCurrentThumbnail'
import { useProjects } from '@/features/editor/hooks/useProjects'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import ProjectThumb from '../project/ProjectThumb'
import { ghostButton, panel, primaryButton, sectionLabel } from '../common/ui'

/**
 * The open draft on the Start screen. Signed out it is "the" project, kept in this browser (Continue). Signed in it
 * is a project not saved to the account yet (a failed save after sign-in or upload): Save / Keep editing.
 */
export default function CurrentProjectCard() {
  const { user } = useUser()
  const { createFromDraft } = useProjects()
  const thumbnail = useCurrentThumbnail()
  const name = useDocumentStore((state) => state.name)
  const step = useEditorUiStore((state) => state.step)
  const closeStart = useEditorUiStore((state) => state.closeStart)
  const isSaving = useProjectStore((state) => state.saveStatus === 'saving')

  return (
    <section aria-labelledby="current-project" className="flex flex-col gap-2.5">
      <h2 id="current-project" className={sectionLabel}>{user ? 'Not saved yet' : 'Current project'}</h2>
      <div className={`${panel} rounded-[20px] p-3.5 flex flex-col sm:flex-row sm:items-center gap-4`}>
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <ProjectThumb src={thumbnail} size={64} />
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-base font-semibold text-white truncate">{name}</span>
            <span className="text-[13px] text-white/60">{STEP_LABELS[step]} step</span>
            <span className="flex items-center gap-1.5 text-xs text-white/60">
              {user ? <CloudOff size={13} /> : <Monitor size={13} />}
              {user ? 'Only in this browser, not in your account' : 'Saved in this browser'}
            </span>
          </div>
        </div>
        <div className="flex gap-2.5">
          {user && (
            <button
              onClick={() => void createFromDraft(name)}
              disabled={isSaving}
              className={`${primaryButton} h-11 px-5 text-sm flex-1 sm:flex-none`}
            >
              Save to account
            </button>
          )}
          <button
            onClick={closeStart}
            className={`${user ? ghostButton : primaryButton} h-11 px-5 text-sm flex-1 sm:flex-none`}
          >
            {user ? 'Keep editing' : 'Continue'}
          </button>
        </div>
      </div>
    </section>
  )
}
