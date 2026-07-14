'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useEditorStore } from '@/lib/store/useEditorStore'

export interface Project {
    id: string
    name: string
    updatedAt: string | Date
    percentComplete?: number
}

export interface ProjectListMenuProps {
    projects?: Project[]
    onSelectProject?: (projectId: string) => void
    onCreateNew?: (name: string) => void
    onDeleteProject?: (projectId: string) => void
    maxProjects?: number
    /** Called after a project is selected or created, so the parent can close its menu */
    onClose?: () => void
}

/**
 * Project list with inline create - the body of the project dropdown.
 * Used inside the desktop ProjectSelector dropdown and the mobile menu.
 * The parent supplies the positioned flex-col container.
 */
export default function ProjectListMenu({
    projects = [],
    onSelectProject,
    onCreateNew,
    onDeleteProject,
    maxProjects = 3,
    onClose
}: ProjectListMenuProps) {
    const currentProjectId = useEditorStore(state => state.currentProjectId)

    // Inline Create state
    const [isCreating, setIsCreating] = useState(false)
    const [newProjectName, setNewProjectName] = useState('')
    const createInputRef = useRef<HTMLInputElement>(null)

    // Focus create input when inline create starts
    useEffect(() => {
        if (isCreating && createInputRef.current) {
            // Small timeout to ensure render
            setTimeout(() => {
                createInputRef.current?.focus()
            }, 50)
        }
    }, [isCreating])

    const handleCreateSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!newProjectName.trim()) return

        if (onCreateNew) {
            onCreateNew(newProjectName.trim())
            setIsCreating(false)
            setNewProjectName('')
            onClose?.()
        }
    }

    return (
        <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Projects</h3>
            </div>

            {/* Project List */}
            <div className="overflow-y-auto custom-scrollbar flex-grow py-1">
                {projects.length > 0 ? (
                    projects.map((project) => (
                        <div
                            key={project.id}
                            className={`group flex items-center justify-between px-3 py-2 mx-2 rounded-lg transition-colors ${project.id === currentProjectId ? 'bg-white/10' : 'hover:bg-white/5'
                                }`}
                        >
                            <button
                                onClick={() => {
                                    if (onSelectProject) onSelectProject(project.id)
                                    onClose?.()
                                }}
                                className="flex-1 text-left min-w-0 pr-3"
                            >
                                <div className={`text-sm font-medium truncate ${project.id === currentProjectId ? 'text-pink-400' : 'text-white/90'
                                    }`}>
                                    {project.name || 'Untitled Project'}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center">
                                    {new Date(project.updatedAt).toLocaleDateString()}
                                </div>
                            </button>

                            {project.id === currentProjectId ? (
                                <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (onDeleteProject) onDeleteProject(project.id)
                                    }}
                                    className="opacity-60 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                                    title="Delete project"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="px-6 py-8 text-center text-gray-500 text-sm">
                        No projects found
                    </div>
                )}
            </div>

            {/* Footer Actions - Creating or Default */}
            <div className="p-3 border-t border-white/10 bg-white/5">
                {onCreateNew && (projects.length < maxProjects ? (
                    isCreating ? (
                        <div className="flex items-center gap-2 animate-in fade-in duration-200">
                            <input
                                ref={createInputRef}
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateSubmit()
                                    if (e.key === 'Escape') setIsCreating(false)
                                }}
                                placeholder="Project name..."
                                className="flex-grow bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50"
                            />
                            <button
                                onClick={() => handleCreateSubmit()}
                                disabled={!newProjectName.trim()}
                                className="p-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 hover:text-pink-300 rounded-lg transition-colors disabled:opacity-50"
                                title="Create"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                                title="Cancel"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full py-2 px-4 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 hover:text-pink-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-pink-500/30"
                        >
                            <Plus size={16} />
                            Create New Project
                        </button>
                    )
                ) : (
                    <div className="text-center text-xs text-gray-500 py-1">
                        Project limit reached ({projects.length}/{maxProjects})
                    </div>
                ))}
            </div>
        </>
    )
}
