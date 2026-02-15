'use client'

import { useState, useEffect } from 'react'
import { X, Clock, Trash2, AlertCircle, Plus } from 'lucide-react'
import { devLog } from '@/lib/utils/debug'
import Logo from '@/components/Logo'
import Image from 'next/image'

interface Project {
  id: string
  name: string
  updatedAt: string
  originalImage?: string | null
  croppedImage?: string | null
  percentComplete?: number
}

interface ProjectSelectionModalProps {
  isOpen: boolean
  onClose?: () => void
  onCreateNew: (name: string) => void
  onSelectProject: (projectId: string) => void
  onDeleteProject?: (projectId: string) => void
  projects: Project[]
  hasCurrentState: boolean
  maxProjects?: number
}

export default function ProjectSelectionModal({
  isOpen,
  onClose,
  onCreateNew,
  onSelectProject,
  onDeleteProject,
  projects,
  hasCurrentState,
  maxProjects = 3
}: ProjectSelectionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      devLog('[DEBUG] ProjectSelectionModal opened with:')
      devLog('[DEBUG] - hasCurrentState:', hasCurrentState)
      devLog('[DEBUG] - projects count:', projects.length)
      devLog('[DEBUG] - isAtCapacity:', projects.length >= maxProjects)
    }
  }, [isOpen, hasCurrentState, projects.length, maxProjects])

  const isAtCapacity = projects.length >= maxProjects

  // Sort projects by most recently updated
  const sortedProjects = [...projects].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  if (!isOpen) return null

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDeleting) return

    setIsDeleting(true)
    try {
      await onDeleteProject?.(projectId)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateNew = () => {
    if (newProjectName.trim()) {
      onCreateNew(newProjectName.trim())
      setNewProjectName('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        // Prevent closing if forcing a decision (e.g. initial login)
        onClick={onClose ? onClose : undefined}
        style={{ cursor: onClose ? 'pointer' : 'default' }}
      />

      {/* Modal */}
      <div
        className="glass relative w-full max-w-lg rounded-3xl p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--pink-glow)] rounded-full blur-[100px] pointer-events-none opacity-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--accent-purple)] rounded-full blur-[100px] pointer-events-none opacity-20" />

        {/* Header */}
        <div className="px-8 py-6 border-b border-[var(--border-glass)] relative z-10 flex flex-col items-center justify-center">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-6 top-6 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={20} className="text-white/60 hover:text-white" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image
                src="/favicon.svg"
                alt="Diceify"
                fill
                className="object-contain"
              />
            </div>
            <div className="scale-90 origin-left">
              <Logo />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 relative z-10">

          {/* Create New Section */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                disabled={isAtCapacity}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-[var(--border-glass)] text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--pink)] focus:ring-1 focus:ring-[var(--pink)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleCreateNew}
                disabled={!newProjectName.trim() || isAtCapacity}
                className="px-6 py-3 rounded-xl bg-[var(--pink)] text-white font-medium hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 shadow-[0_0_20px_var(--pink-glow)]"
              >
                <Plus size={18} />
                Create
              </button>
            </div>

            {/* Capacity Warning */}
            {isAtCapacity && (
              <div className="flex flex-col items-center justify-center text-center gap-1.5 text-purple-300 text-sm bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle size={16} />
                  <span>Project limit reached ({maxProjects}/{maxProjects})</span>
                </div>
                <span className="opacity-80">Delete an existing project to create a new one.</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--border-glass)] w-full" />

          {/* Existing Projects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Recent Projects
              </h3>
              <span className="text-xs text-[var(--text-dim)]">
                {sortedProjects.length} of {maxProjects} slots used
              </span>
            </div>

            {sortedProjects.length > 0 ? (
              <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {sortedProjects.map(project => (
                  <div
                    key={project.id}
                    className="p-4 rounded-xl border border-[var(--border-glass)] bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all group flex items-center gap-4"
                  >
                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate mb-1 group-hover:text-[var(--pink)] transition-colors">
                        {project.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                        {project.percentComplete !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-[var(--text-dim)]" />
                            {project.percentComplete.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectProject(project.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--pink-glow-soft)] text-[var(--pink)] hover:bg-[var(--pink)] hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                      >
                        Open
                      </button>

                      {onDeleteProject && (
                        <button
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          disabled={isDeleting}
                          className="p-2.5 rounded-lg hover:bg-purple-500/20 text-white/40 hover:text-purple-400 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Project"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-dim)] text-sm border border-dashed border-[var(--border-glass)] rounded-xl">
                No projects found. Create one above to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}