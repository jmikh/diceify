'use client'

import { useState, useRef, useEffect } from 'react'
import { theme } from '@/lib/theme'
import { Cloud, ChevronDown, Plus, X, Check } from 'lucide-react'
import { devError } from '@/lib/utils/debug'
import { useEditorStore } from '@/lib/store/useEditorStore'

interface Project {
  id: string
  name: string
  updatedAt: string | Date
  percentComplete?: number
}

interface ProjectSelectorProps {
  projects?: Project[]
  onSelectProject?: (projectId: string) => void
  onCreateNew?: (name: string) => void
  onDeleteProject?: (projectId: string) => void
  maxProjects?: number
}

export default function ProjectSelector({
  projects = [],
  onSelectProject,
  onCreateNew,
  onDeleteProject,
  maxProjects = 3
}: ProjectSelectorProps) {
  // Get state directly from Zustand instead of props
  const currentProject = useEditorStore(state => state.projectName)
  const currentProjectId = useEditorStore(state => state.currentProjectId)
  const lastSaved = useEditorStore(state => state.lastSaved)
  const isSaving = useEditorStore(state => state.isSaving)
  const setProjectName = useEditorStore(state => state.setProjectName)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(currentProject)
  const [isCloudHovering, setIsCloudHovering] = useState(false)
  const [showSaveAnimation, setShowSaveAnimation] = useState(false)

  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Inline Create state
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)
  const prevIsSavingRef = useRef(isSaving)

  // Check if the current project name is actually empty/untitled or has the default pattern
  const isDefaultName = !currentProject ||
    currentProject.startsWith('Untitled Project') ||
    currentProject.trim() === ''

  // Format display name with ellipsis if needed
  const rawDisplayName = currentProject || 'Untitled Project'
  const displayName = rawDisplayName.length > 20
    ? rawDisplayName.substring(0, 17) + '...'
    : rawDisplayName

  // Update edit value when current project changes
  useEffect(() => {
    setEditValue(currentProject)
  }, [currentProject])

  // Trigger save animation when saving completes
  useEffect(() => {
    if (prevIsSavingRef.current && !isSaving) {
      // Just finished saving - trigger the green flash
      setShowSaveAnimation(true)
      setTimeout(() => setShowSaveAnimation(false), 600) // Match animation duration
    }
    prevIsSavingRef.current = isSaving
  }, [isSaving])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Focus create input when inline create starts
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      // Small timeout to ensure render
      setTimeout(() => {
        createInputRef.current?.focus()
      }, 50)
    }
  }, [isCreating])

  // Reset creation state when dropdown closes
  useEffect(() => {
    if (!showDropdown) {
      setIsCreating(false)
      setNewProjectName('')
    }
  }, [showDropdown])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleEditComplete = () => {
    setIsEditing(false)
    const trimmedValue = editValue.trim()

    // If we have a valid new name that's different from the current stored name
    if (trimmedValue && trimmedValue !== currentProject) {
      handleRenameProject()
    } else if (!trimmedValue) {
      // Reset to current name if empty
      setEditValue(currentProject)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditComplete()
    } else if (e.key === 'Escape') {
      setEditValue(currentProject)
      setIsEditing(false)
    }
  }

  const handleCreateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newProjectName.trim()) return

    if (onCreateNew) {
      onCreateNew(newProjectName.trim())
      setIsCreating(false)
      setNewProjectName('')
      setShowDropdown(false)
    }
  }

  const handleRenameProject = async () => {
    const trimmedValue = editValue.trim()

    if (!currentProjectId || !trimmedValue) {
      setEditValue(currentProject)
      return
    }

    try {
      const response = await fetch(`/api/projects/${currentProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedValue })
      })

      if (response.ok) {
        setProjectName(trimmedValue)
      }
    } catch (error) {
      devError('Failed to rename project:', error)
      setEditValue(currentProject)
    }
  }

  const [isHovering, setIsHovering] = useState(false)

  // Format the last saved time
  const formatSaveTime = (date: Date | null | undefined) => {
    if (!date) return 'Never saved'

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 15) return 'Just now'
    if (seconds < 60) return `${seconds} seconds ago`
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  // Determine save status text
  const getSaveStatus = () => {
    if (isSaving) return 'Saving...'
    if (!lastSaved) return 'Not saved'
    return `Saved ${formatSaveTime(lastSaved)}`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        data-testid="project-selector"
        className="inline-flex items-center px-4 py-2 rounded-full border transition-all"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={{
          backgroundColor: isEditing || showDropdown
            ? 'rgba(255, 255, 255, 0.1)'
            : isHovering
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(255, 255, 255, 0.05)',
          borderColor: isEditing || showDropdown
            ? theme.colors.accent.pink + '66'
            : isHovering
              ? 'rgba(255, 255, 255, 0.3)'
              : 'rgba(255, 255, 255, 0.1)',
          minWidth: '240px', // Fixed width as requested
          width: '240px',    // Fixed width as requested
          maxWidth: '240px', // Fixed width as requested
        }}
      >
        {/* Cloud icon with save status */}
        <div className="relative mr-2 flex-shrink-0">
          <div
            onMouseEnter={() => setIsCloudHovering(true)}
            onMouseLeave={() => setIsCloudHovering(false)}
            className="relative cursor-help"
          >
            <Cloud
              size={16}
              className={`transition-all ${showSaveAnimation ? 'save-flash' : ''}`}
              style={{
                color: showSaveAnimation
                  ? undefined // Let the animation control the color
                  : lastSaved
                    ? theme.colors.text.secondary
                    : theme.colors.text.muted
              }}
            />

            {/* Tooltip */}
            {isCloudHovering && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs rounded-lg transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-md border z-50"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  borderColor: theme.colors.glass.border,
                  color: theme.colors.text.primary
                }}
              >
                {getSaveStatus()}
              </div>
            )}
          </div>
        </div>

        {/* Project Name / Input */}
        <div className="flex-grow min-w-0 mr-1 overflow-hidden relative">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditComplete}
              onKeyDown={handleKeyDown}
              className="bg-transparent outline-none text-sm font-medium w-full"
              style={{
                color: theme.colors.text.primary
              }}
              placeholder="Enter project name..."
            />
          ) : (
            <button
              onClick={() => {
                setIsEditing(true)
                // Select all text if it's a default name
                if (isDefaultName) {
                  setEditValue(currentProject)
                }
              }}
              className="text-left text-sm font-medium w-full transition-all truncate block"
              style={{
                color: isDefaultName ? theme.colors.text.muted : theme.colors.text.primary
              }}
              title={rawDisplayName}
            >
              {rawDisplayName}
            </button>
          )}
        </div>

        {/* Dropdown Trigger Chevron */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors ml-1 ${showDropdown ? 'bg-white/10' : ''}`}
        >
          <ChevronDown
            size={14}
            className={`transition-transform text-gray-400 ${showDropdown ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 bg-[#0a0014]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50 flex flex-col"
          style={{ maxHeight: '400px' }}
        >
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
                      setShowDropdown(false)
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
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
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
        </div>
      )}
    </div>
  )
}