'use client'

import { useState, useRef, useEffect } from 'react'
import { theme } from '@/lib/theme'
import { Cloud, ChevronDown } from 'lucide-react'
import { devError } from '@/lib/utils/debug'
import { useEditorStore } from '@/lib/store/useEditorStore'
import ProjectListMenu, { Project } from './ProjectListMenu'
import { formatSaveStatus } from '@/lib/utils/saveStatus'

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

  const inputRef = useRef<HTMLInputElement>(null)
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
                {formatSaveStatus(isSaving, lastSaved)}
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
          <ProjectListMenu
            projects={projects}
            onSelectProject={onSelectProject}
            onCreateNew={onCreateNew}
            onDeleteProject={onDeleteProject}
            maxProjects={maxProjects}
            onClose={() => setShowDropdown(false)}
          />
        </div>
      )}
    </div>
  )
}