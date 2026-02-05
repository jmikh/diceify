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

interface BuildProgress {
  x: number
  y: number
  percentage: number
}

interface EditorState {
  // Workflow State
  step: WorkflowStep


  // Editor Data
  originalImage: string | null
  croppedImage: string | null
  processedImageUrl: string | null
  cropParams: CropParams | null
  hasCropChanged: boolean

  // Dice Configuration
  diceParams: DiceParams
  diceStats: DiceStats
  diceGrid: DiceGrid | null

  // Project Metadata
  projectName: string
  currentProjectId: string | null
  lastSaved: Date | null
  isSaving: boolean

  // Saved State for Dirty Checking
  savedDiceParams: DiceParams | null
  savedCropParams: CropParams | null

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
  setHasCropChanged: (changed: boolean) => void
  setDiceParams: (params: Partial<DiceParams>) => void
  setDiceStats: (stats: DiceStats) => void
  setDiceGrid: (grid: DiceGrid | null) => void

  // Actions to update saved state
  setSavedTuneState: (params: DiceParams) => void
  setSavedCropState: (params: CropParams) => void

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
  completeCrop: (croppedImageUrl: string, crop: CropParams) => void
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
  hasCropChanged: false,
  savedCropParams: null,

  diceParams: DEFAULT_DICE_PARAMS,

  savedDiceParams: null,

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

  buildProgress: { x: 0, y: 0, percentage: 0 },

  selectedRatio: '1:1',
  cropRotation: 0,

  // Actions
  setStep: (step) => set({ step }),


  setOriginalImage: (url) => set({ originalImage: url }),
  setCroppedImage: (url) => set({ croppedImage: url }),
  setProcessedImageUrl: (url) => set({ processedImageUrl: url }),

  setCropParams: (params) => set((state) => {
    // Only update if values actually changed
    if (JSON.stringify(state.cropParams) === JSON.stringify(params)) return state
    return { cropParams: params }
  }),
  setHasCropChanged: (changed) => set({ hasCropChanged: changed }),

  setDiceParams: (params) => set((state) => {
    const newParams = { ...state.diceParams, ...params }
    // Only update if values actually changed
    if (JSON.stringify(state.diceParams) === JSON.stringify(newParams)) return state
    return { diceParams: newParams }
  }),

  setDiceStats: (stats) => set((state) => {
    // Only update if values actually changed
    if (JSON.stringify(state.diceStats) === JSON.stringify(stats)) return state
    return { diceStats: stats }
  }),
  setDiceGrid: (grid) => set({ diceGrid: grid }),

  setSavedTuneState: (params) => set({
    savedDiceParams: { ...params },
  }),

  setSavedCropState: (params) => set({
    savedCropParams: { ...params },
  }),

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
    // Only update if values actually changed
    if (JSON.stringify(state.buildProgress) === JSON.stringify(newProgress)) return state
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
      diceStats: DEFAULT_DICE_STATS,
      buildProgress: { x: 0, y: 0, percentage: 0 }
    })
  },

  updateCrop: (croppedImageUrl: string, crop: CropParams) => set((state) => {
    // Only update if cropParams actually changed
    if (JSON.stringify(state.cropParams) === JSON.stringify(crop)) return state
    return {
      croppedImage: croppedImageUrl,
      cropParams: crop,
      // Don't change step here
    }
  }),

  completeCrop: (croppedImageUrl: string, crop: CropParams) => set((state) => {
    // Only update if cropParams actually changed
    if (JSON.stringify(state.cropParams) === JSON.stringify(crop) && state.step === 'tune') return state
    return {
      croppedImage: croppedImageUrl,
      cropParams: crop,
      step: 'tune',
      diceGrid: null
    }
  }),

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
      buildProgress: { x: 0, y: 0, percentage: 0 },
      diceGrid: null,
      savedDiceParams: null,
      savedCropParams: null,
      selectedRatio: '1:1',
      cropRotation: 0,
      // We don't reset project ID or name here usually, unless explicitly creating new
    })
  }
}))
