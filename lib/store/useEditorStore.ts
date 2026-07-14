import { create } from 'zustand'
import { WorkflowStep, DiceParams, DiceStats, DiceGrid, ColorMode, AspectRatio } from '@/lib/types'
import { devLog } from '@/lib/utils/debug'

interface CropParams {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

// Position of the die currently being placed. Completed count and percentage
// are derived from this + the grid dimensions, never stored.
interface BuildProgress {
  x: number
  y: number
}

// The params the current build progress was made against. Progress is only
// meaningful for the exact grid it was built on; when current params drift
// from this baseline, entering the build step resets progress (and the
// autosave reports progress as 0 to keep persisted state self-consistent).
interface BuildBaseline {
  crop: CropParams | null
  dice: DiceParams
}

const jsonEquals = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Crop coordinates jitter by fractions of a pixel when the cropper remounts,
// so compare with a tolerance instead of exact equality
const cropParamsEqual = (a: CropParams | null, b: CropParams | null): boolean => {
  if (!a || !b) return a === b
  const t = 0.01
  return Math.abs(a.x - b.x) < t &&
    Math.abs(a.y - b.y) < t &&
    Math.abs(a.width - b.width) < t &&
    Math.abs(a.height - b.height) < t &&
    Math.abs(a.rotation - b.rotation) < t
}

// Does the current build progress still apply to the current params?
export const matchesBuildBaseline = (state: Pick<EditorState, 'buildBaseline' | 'cropParams' | 'diceParams'>): boolean => {
  return !!state.buildBaseline &&
    cropParamsEqual(state.buildBaseline.crop, state.cropParams) &&
    jsonEquals(state.buildBaseline.dice, state.diceParams)
}

interface EditorState {
  // Workflow State
  step: WorkflowStep


  // Editor Data
  originalImage: string | null
  croppedImage: string | null
  processedImageUrl: string | null
  cropParams: CropParams | null

  // Dice Configuration
  diceParams: DiceParams
  diceStats: DiceStats
  diceGrid: DiceGrid | null

  // Project Metadata
  projectName: string
  currentProjectId: string | null
  lastSaved: Date | null
  isSaving: boolean

  // Params the current build progress was made against
  buildBaseline: BuildBaseline | null

  // UI State
  isInitializing: boolean
  isCropping: boolean
  showAuthModal: boolean
  authModalMessage: string | null
  showProjectModal: boolean

  showLimitModal: boolean
  showProFeatureModal: boolean
  showCommissionModal: boolean

  // Build State
  buildProgress: BuildProgress

  // Crop State
  selectedRatio: AspectRatio
  cropRotation: number

  // Actions
  setStep: (step: WorkflowStep) => void

  setOriginalImage: (url: string | null) => void
  setCroppedImage: (url: string | null) => void
  setProcessedImageUrl: (url: string | null) => void
  setCropParams: (params: CropParams | null) => void
  setDiceParams: (params: Partial<DiceParams>) => void
  setDiceStats: (stats: DiceStats) => void
  setDiceGrid: (grid: DiceGrid | null) => void

  // Re-anchor the baseline to the current params (after load/hydrate)
  setBuildBaseline: () => void

  setProjectName: (name: string) => void
  setCurrentProjectId: (id: string | null) => void
  setLastSaved: (date: Date | null) => void
  setIsSaving: (isSaving: boolean) => void
  setIsInitializing: (isInitializing: boolean) => void
  setIsCropping: (isCropping: boolean) => void
  setShowAuthModal: (show: boolean) => void
  setAuthModalMessage: (message: string | null) => void
  setShowProjectModal: (show: boolean) => void

  setShowLimitModal: (show: boolean) => void
  setShowProFeatureModal: (show: boolean) => void
  setShowCommissionModal: (show: boolean) => void

  setBuildProgress: (progress: BuildProgress | ((prev: BuildProgress) => BuildProgress)) => void
  setSelectedRatio: (ratio: AspectRatio) => void
  setCropRotation: (rotation: number) => void

  // Complex Actions
  uploadImage: (url: string) => void
  updateCrop: (croppedImageUrl: string, crop: CropParams) => void
  enterBuild: () => void
  resetWorkflow: () => void
}

const DEFAULT_DICE_PARAMS: DiceParams = {
  numRows: 30,
  colorMode: 'both',
  contrast: 0,
  gamma: 1.0,
  edgeSharpening: 0,
  rotate6: false,
  rotate3: false,
  rotate2: false,
}

export const DEFAULT_DICE_STATS: DiceStats = {
  blackCount: 0,
  whiteCount: 0,
  totalCount: 0,
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial State
  step: 'upload',


  originalImage: null,
  croppedImage: null,
  processedImageUrl: null,
  cropParams: null,
  buildBaseline: null,

  diceParams: DEFAULT_DICE_PARAMS,

  diceStats: DEFAULT_DICE_STATS,
  diceGrid: null,

  projectName: 'Untitled Project',
  currentProjectId: null,
  lastSaved: null,
  isSaving: false,

  isInitializing: true,
  isCropping: false,
  showAuthModal: false,
  authModalMessage: null,
  showProjectModal: false,

  showLimitModal: false,
  showProFeatureModal: false,
  showCommissionModal: false,

  buildProgress: { x: 0, y: 0 },

  selectedRatio: '1:1',
  cropRotation: 0,

  // Actions
  setStep: (step) => set({ step }),


  setOriginalImage: (url) => set({ originalImage: url }),
  setCroppedImage: (url) => set({ croppedImage: url }),
  setProcessedImageUrl: (url) => set({ processedImageUrl: url }),

  // Note: the jsonEquals guards below aren't just an optimization — canvas
  // and cropper callbacks re-emit identical values on every interaction, and
  // a new object reference would re-render every subscriber.
  setCropParams: (params) => set((state) => {
    if (jsonEquals(state.cropParams, params)) return state
    return { cropParams: params }
  }),
  setDiceParams: (params) => set((state) => {
    const newParams = { ...state.diceParams, ...params }
    if (jsonEquals(state.diceParams, newParams)) return state
    return { diceParams: newParams }
  }),

  setDiceStats: (stats) => set((state) => {
    if (jsonEquals(state.diceStats, stats)) return state
    return { diceStats: stats }
  }),
  setDiceGrid: (grid) => set({ diceGrid: grid }),

  setBuildBaseline: () => set((state) => ({
    buildBaseline: { crop: state.cropParams, dice: state.diceParams }
  })),

  setProjectName: (name) => set({ projectName: name }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setLastSaved: (date) => set({ lastSaved: date }),
  setIsSaving: (isSaving) => set({ isSaving }),

  setIsInitializing: (isInitializing) => set({ isInitializing }),
  setIsCropping: (isCropping) => set({ isCropping }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  setAuthModalMessage: (message) => set({ authModalMessage: message }),
  setShowProjectModal: (show) => set({ showProjectModal: show }),

  setShowLimitModal: (show) => set({ showLimitModal: show }),
  setShowProFeatureModal: (show) => set({ showProFeatureModal: show }),
  setShowCommissionModal: (show) => set({ showCommissionModal: show }),

  setBuildProgress: (progress) => set((state) => {
    const newProgress = typeof progress === 'function' ? progress(state.buildProgress) : progress
    if (jsonEquals(state.buildProgress, newProgress)) return state
    return { buildProgress: newProgress }
  }),

  setSelectedRatio: (ratio) => set({ selectedRatio: ratio }),
  setCropRotation: (rotation) => set({ cropRotation: rotation }),

  uploadImage: (url: string) => {
    set({
      originalImage: url,
      step: 'crop',

      croppedImage: null,
      processedImageUrl: null,
      diceGrid: null,
      cropParams: null,
      cropRotation: 0,
      selectedRatio: '1:1',
      buildBaseline: null,
      diceStats: DEFAULT_DICE_STATS,
      buildProgress: { x: 0, y: 0 }
    })
  },

  updateCrop: (croppedImageUrl: string, crop: CropParams) => set((state) => {
    // Skip only when nothing would change. croppedImage can be missing while
    // cropParams are set (restored draft/project) - always store the image then,
    // or later steps have nothing to generate dice from.
    if (state.croppedImage && jsonEquals(state.cropParams, crop)) return state
    return {
      croppedImage: croppedImageUrl,
      cropParams: crop,
      // Don't change step here
    }
  }),

  // The single gateway into the build step. If crop/tune params changed since
  // the progress was made, the progress is for a different grid — reset it.
  enterBuild: () => set((state) => ({
    step: 'build',
    buildProgress: matchesBuildBaseline(state) ? state.buildProgress : { x: 0, y: 0 },
    buildBaseline: { crop: state.cropParams, dice: state.diceParams },
  })),

  resetWorkflow: () => {
    devLog('[STORE] Resetting workflow')
    set({
      step: 'upload',
      originalImage: null,
      croppedImage: null,
      cropParams: null,
      processedImageUrl: null,
      diceParams: DEFAULT_DICE_PARAMS,
      diceStats: DEFAULT_DICE_STATS,
      buildProgress: { x: 0, y: 0 },
      diceGrid: null,
      buildBaseline: null,
      selectedRatio: '1:1',
      cropRotation: 0,
      // We don't reset project ID or name here usually, unless explicitly creating new
    })
  }
}))
