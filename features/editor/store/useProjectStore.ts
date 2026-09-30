// Which project the editor is working on and how its persistence is going. The image is the one
// piece of project state that is not part of the document (large, changes only on upload).

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

/** What the project list needs (the API list endpoint omits the large columns). */
export interface ProjectSummary {
  id: string
  name: string
  updatedAt: string
  percentComplete?: number
}

interface ProjectState {
  /** 'booting' until the page has decided what to show (draft, project, dashboard). */
  boot: 'booting' | 'ready'
  projectId: string | null
  /** The original image as a data URL (C3 replaces this with storage + a Blob for drafts). */
  imageSrc: string | null
  saveStatus: SaveStatus
  lastSaved: Date | null
  projects: ProjectSummary[]

  setBoot: (boot: 'booting' | 'ready') => void
  setProjectId: (id: string | null) => void
  setImageSrc: (src: string | null) => void
  setSaveStatus: (status: SaveStatus) => void
  setLastSaved: (date: Date | null) => void
  setProjects: (projects: ProjectSummary[]) => void
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set) => ({
    boot: 'booting',
    projectId: null,
    imageSrc: null,
    saveStatus: 'idle',
    lastSaved: null,
    projects: [],

    setBoot: (boot) => set({ boot }),
    setProjectId: (projectId) => set({ projectId }),
    setImageSrc: (imageSrc) => set({ imageSrc }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setLastSaved: (lastSaved) => set({ lastSaved }),
    setProjects: (projects) => set({ projects }),
  })),
)
