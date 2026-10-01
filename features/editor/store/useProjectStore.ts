// Which project the editor is working on and how its persistence is going. The image is the one
// piece of project state that is not part of the document (large, immutable per project).

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ProjectSummary } from '@/lib/supabase/projects'

export type { ProjectSummary }
export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface ProjectState {
  /** 'booting' until the page has decided what to show (draft, project, dashboard). */
  boot: 'booting' | 'ready'
  projectId: string | null
  /** `cloud_version` of the loaded row; the autosave's compare-and-set expectation. Null for drafts. */
  cloudVersion: number | null
  /** Object URL of the image for the pipeline and the cropper. */
  imageSrc: string | null
  /** The image bytes: uploaded on "save as project", kept afterwards so a project deleted elsewhere can fall back to a draft. */
  imageBlob: Blob | null
  saveStatus: SaveStatus
  lastSaved: Date | null
  projects: ProjectSummary[]
  /** Thumbnail URL by project id (signed URLs from the list, data URLs for thumbnails written this session). */
  previews: Record<string, string>

  setBoot: (boot: 'booting' | 'ready') => void
  setProjectId: (id: string | null) => void
  setCloudVersion: (version: number | null) => void
  /** Swap the image; the previous object URL is revoked. */
  setImage: (src: string | null, blob: Blob | null) => void
  setSaveStatus: (status: SaveStatus) => void
  setLastSaved: (date: Date | null) => void
  setProjects: (projects: ProjectSummary[]) => void
  setPreviews: (previews: Record<string, string>) => void
  setPreview: (projectId: string, url: string) => void
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set) => ({
    boot: 'booting',
    projectId: null,
    cloudVersion: null,
    imageSrc: null,
    imageBlob: null,
    saveStatus: 'idle',
    lastSaved: null,
    projects: [],
    previews: {},

    setBoot: (boot) => set({ boot }),
    setProjectId: (projectId) => set({ projectId }),
    setCloudVersion: (cloudVersion) => set({ cloudVersion }),
    setImage: (imageSrc, imageBlob) =>
      set((state) => {
        if (state.imageSrc && state.imageSrc !== imageSrc && state.imageSrc.startsWith('blob:')) {
          URL.revokeObjectURL(state.imageSrc)
        }
        return { imageSrc, imageBlob }
      }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setLastSaved: (lastSaved) => set({ lastSaved }),
    setProjects: (projects) => set({ projects }),
    setPreviews: (previews) => set({ previews }),
    setPreview: (projectId, url) => set((state) => ({ previews: { ...state.previews, [projectId]: url } })),
  })),
)
