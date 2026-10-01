'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { useCurrentThumbnail } from '@/features/editor/hooks/useCurrentThumbnail'
import { useProjects } from '@/features/editor/hooks/useProjects'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore, type ProjectSummary } from '@/features/editor/store/useProjectStore'
import DeleteConfirm from './DeleteConfirm'
import ProjectThumb from './ProjectThumb'
import { formatBuilt, formatEdited } from './format'
import { PopoverHeader } from './PopoverHeader'

/** Signed-in switcher: the projects (thumbnail, progress, rename the open one, delete), an unsaved draft on top, new project. */
export default function ProjectMenu({ onClose }: { onClose: () => void }) {
  const { projects, load, remove, createFromDraft } = useProjects()
  const projectId = useProjectStore((state) => state.projectId)
  const hasDraft = useProjectStore((state) => state.imageSrc !== null && state.projectId === null)
  const isSaving = useProjectStore((state) => state.saveStatus === 'saving')
  const name = useDocumentStore((state) => state.name)
  const thumbnail = useCurrentThumbnail()
  const openStart = useEditorUiStore((state) => state.openStart)

  return (
    <>
      <PopoverHeader title="Your projects" right={<span className="text-xs text-white/60">{projects.length}</span>} />
      <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-0.5">
        {hasDraft && (
          <div className="flex items-center gap-3 p-1.5 rounded-xl bg-white/[0.07]">
            <ProjectThumb src={thumbnail} size={40} />
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-accent-pink-light truncate">{name}</span>
              <span className="text-xs text-white/60">Not saved to your account</span>
            </span>
            <button
              onClick={() => void createFromDraft(name)}
              disabled={isSaving}
              className="h-8 px-3 rounded-full bg-accent-pink/15 border border-accent-pink/35 text-accent-pink-light text-xs font-semibold hover:bg-accent-pink/25 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
        {projects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            isCurrent={project.id === projectId}
            onOpen={() => {
              if (project.id !== projectId) void load(project.id)
              onClose()
            }}
            onDelete={() => remove(project.id)}
          />
        ))}
        {projects.length === 0 && !hasDraft && <p className="px-3 py-6 text-center text-sm text-white/60">No projects yet</p>}
      </div>
      <div className="p-3 pt-2.5 border-t border-white/[0.08] flex flex-col gap-2">
        <button
          onClick={() => {
            openStart()
            onClose()
          }}
          className="flex items-center justify-center gap-2 h-11 rounded-xl border border-accent-pink/35 bg-accent-pink/[0.14] text-accent-pink-light text-sm font-semibold hover:bg-accent-pink/[0.22]"
        >
          <ImagePlus size={17} />
          New Project
        </button>
      </div>
    </>
  )
}

interface ProjectRowProps {
  project: ProjectSummary
  isCurrent: boolean
  onOpen: () => void
  onDelete: () => Promise<void>
}

function ProjectRow({ project, isCurrent, onOpen, onDelete }: ProjectRowProps) {
  const stored = useProjectStore((state) => state.previews[project.id] ?? null)
  const live = useCurrentThumbnail()
  // The open project's name is live (renames ride the autosave snapshot; the list is not refetched)
  const liveName = useDocumentStore((state) => state.name)
  const name = isCurrent ? liveName : project.name
  const [confirming, setConfirming] = useState(false)
  const [renaming, setRenaming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-3 p-1.5 rounded-xl bg-red-500/[0.06]">
        <DeleteConfirm name={project.name} onConfirm={onDelete} onCancel={() => setConfirming(false)} />
      </div>
    )
  }

  return (
    <div className={`group flex items-center gap-2.5 p-1.5 rounded-xl ${isCurrent ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
      {renaming ? (
        <span className="flex-1 min-w-0 flex items-center gap-3">
          <ProjectThumb src={live} size={40} />
          <RenameInput onDone={() => setRenaming(false)} />
        </span>
      ) : (
        <button onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-3 text-left">
          <ProjectThumb src={isCurrent ? live : stored} size={40} />
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-accent-pink-light' : 'text-white/90'}`}>{name}</span>
            <span className="text-xs text-white/60">
              {formatBuilt(project.percentComplete)} · {isCurrent ? 'open now' : formatEdited(project.updatedAt)}
            </span>
          </span>
        </button>
      )}
      {isCurrent ? (
        !renaming && (
          <button
            onClick={() => setRenaming(true)}
            aria-label="Rename project"
            title="Rename"
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06]"
          >
            <Pencil size={15} />
          </button>
        )
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${project.name}`}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-white/50 hover:text-red-300 hover:bg-red-500/10 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

/**
 * The open project's name, edited in place. It saves when the input goes away — Enter, blur, or the popover closing
 * (an outside click unmounts it before any blur) — and the name rides the autosave snapshot. Escape cancels.
 */
function RenameInput({ onDone }: { onDone: () => void }) {
  const [draft, setDraft] = useState(() => useDocumentStore.getState().name)
  // What to commit on unmount; null = cancelled
  const pending = useRef<string | null>(draft)

  useEffect(
    () => () => {
      const next = pending.current?.trim()
      const { name, setName } = useDocumentStore.getState()
      if (next && next !== name) setName(next)
    },
    [],
  )

  return (
    <input
      autoFocus
      aria-label="Project name"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        pending.current = e.target.value
      }}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone()
        if (e.key === 'Escape') {
          // Cancel the rename, keep the popover open
          e.stopPropagation()
          pending.current = null
          onDone()
        }
      }}
      className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-white/[0.12] bg-black/30 text-sm font-semibold text-white outline-none focus:border-accent-pink/50 focus:ring-1 focus:ring-accent-pink/40"
    />
  )
}
