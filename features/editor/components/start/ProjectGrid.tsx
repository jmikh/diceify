'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useCurrentThumbnail } from '@/features/editor/hooks/useCurrentThumbnail'
import { useProjects } from '@/features/editor/hooks/useProjects'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore, type ProjectSummary } from '@/features/editor/store/useProjectStore'
import DeleteConfirm from '../project/DeleteConfirm'
import ProjectThumb from '../project/ProjectThumb'
import { formatBuilt, formatEdited } from '../project/format'
import { panel } from '../common/ui'

/** The signed-in user's projects on the Start screen: open one, or delete one (two-step confirm). */
export default function ProjectGrid() {
  const { projects, load, remove } = useProjects()

  if (projects.length === 0) return null

  return (
    <section aria-labelledby="your-projects" className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="your-projects" className="text-base font-semibold text-white">Your projects</h2>
        <span className="text-[13px] text-white/60">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
        </span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} onOpen={load} onDelete={remove} />
          </li>
        ))}
      </ul>
    </section>
  )
}

interface ProjectCardProps {
  project: ProjectSummary
  onOpen: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const isCurrent = useProjectStore((state) => state.projectId === project.id)
  const stored = useProjectStore((state) => state.previews[project.id] ?? null)
  const live = useCurrentThumbnail()
  const closeStart = useEditorUiStore((state) => state.closeStart)
  const [confirming, setConfirming] = useState(false)

  const open = () => (isCurrent ? closeStart() : onOpen(project.id))

  return (
    <div className={`${panel} group relative rounded-[18px] p-3 flex items-center gap-3.5 ${isCurrent ? 'border-accent-pink/40' : 'hover:border-white/20'}`}>
      <button onClick={open} className="flex items-center gap-3.5 flex-1 min-w-0 text-left" aria-label={`Open ${project.name}`}>
        <ProjectThumb src={isCurrent ? live : stored} size={72} />
        <span className="flex flex-col gap-1.5 min-w-0 flex-1">
          <span className="text-[15px] font-semibold text-white truncate pr-8">{project.name}</span>
          <span className="text-xs text-white/60">
            {formatBuilt(project.percentComplete)} · {isCurrent ? 'Open now' : formatEdited(project.updatedAt)}
          </span>
          {project.percentComplete > 0 && (
            <span aria-hidden className="block h-1 rounded-full bg-white/10 overflow-hidden">
              <span className="block h-full bg-accent-pink" style={{ width: `${Math.min(100, project.percentComplete)}%` }} />
            </span>
          )}
        </span>
      </button>

      {confirming ? (
        <div className="absolute inset-0 rounded-[18px] bg-[#0e0618]/95 flex items-center justify-center px-4">
          <DeleteConfirm name={project.name} onConfirm={() => onDelete(project.id)} onCancel={() => setConfirming(false)} />
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${project.name}`}
          className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-red-300 hover:bg-red-500/10 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}
