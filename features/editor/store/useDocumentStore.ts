// The editable project document (crop + tune params + build progress + name) under zundo undo/redo.
// Only `crop` and `dice` are tracked (partialize); progress/name/baseline are flat siblings so an undo's
// shallow `set(pastState)` never touches them. See plans/revamp/revamp-tiered-plan.md → "Editor state".

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { temporal } from 'zundo'
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_DICE_PARAMS,
  gridInputsEqual,
  progressApplies,
  type BuildBaseline,
  type CropParams,
  type DiceParams,
  type GridPos,
  type ProjectDocument,
  type StoredGrid,
} from '@/core/dice'
import type { Step } from '../steps'
import { useDerivedStore, type DerivedState } from './useDerivedStore'
import { useEditorUiStore } from './useEditorUiStore'

export const DEFAULT_PROJECT_NAME = 'Untitled Project'

interface DocumentState {
  crop: CropParams | null
  dice: DiceParams
  /** Position of the die currently being placed. Completed count and percentage are derived, never stored. */
  buildProgress: GridPos
  /**
   * The params the current build progress was made against. Progress is only meaningful for the exact
   * grid it was built on; when current params drift from this baseline, entering the build step resets
   * progress (and `buildDocument` reports progress as 0 to keep persisted state self-consistent).
   */
  buildBaseline: BuildBaseline | null
  /** Project name (persisted with the project, not part of the document / history). */
  name: string

  setCrop: (crop: CropParams | null) => void
  updateCrop: (patch: Partial<CropParams>) => void
  updateDice: (patch: Partial<DiceParams>) => void
  setBuildProgress: (progress: GridPos | ((prev: GridPos) => GridPos)) => void
  setName: (name: string) => void
  /** The single gateway into the build step: keeps progress only if it still applies, re-anchors the baseline. */
  enterBuild: () => void
  /** New image: crop and progress go, tune params stay. */
  resetForNewImage: () => void
  /** Everything back to defaults (name and project id are not ours to reset). */
  resetAll: () => void
  /** Load a document; the loaded progress belongs to the loaded params. */
  loadDocument: (doc: ProjectDocument, name: string) => void
}

type TrackedState = Pick<DocumentState, 'crop' | 'dice'>

const jsonEquals = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const ORIGIN: GridPos = { x: 0, y: 0 }

export const useDocumentStore = create<DocumentState>()(
  subscribeWithSelector(
    temporal(
      (set) => ({
        crop: null,
        dice: DEFAULT_DICE_PARAMS,
        buildProgress: ORIGIN,
        buildBaseline: null,
        name: DEFAULT_PROJECT_NAME,

        // The jsonEquals guards below aren't just an optimization — canvas and cropper callbacks re-emit
        // identical values on every interaction, and a new object reference would re-render every subscriber.
        setCrop: (crop) => set((state) => (jsonEquals(state.crop, crop) ? state : { crop })),
        updateCrop: (patch) =>
          set((state) => {
            if (!state.crop) return state
            const crop = { ...state.crop, ...patch }
            return jsonEquals(state.crop, crop) ? state : { crop }
          }),
        updateDice: (patch) =>
          set((state) => {
            const dice = { ...state.dice, ...patch }
            return jsonEquals(state.dice, dice) ? state : { dice }
          }),
        setBuildProgress: (progress) =>
          set((state) => {
            const next = typeof progress === 'function' ? progress(state.buildProgress) : progress
            return jsonEquals(state.buildProgress, next) ? state : { buildProgress: next }
          }),
        setName: (name) => set({ name }),

        enterBuild: () =>
          set((state) => ({
            buildProgress: progressApplies(state, state.buildBaseline) ? state.buildProgress : ORIGIN,
            buildBaseline: { crop: state.crop, dice: state.dice },
          })),

        resetForNewImage: () => set({ crop: null, buildProgress: ORIGIN, buildBaseline: null }),
        resetAll: () => set({ crop: null, dice: DEFAULT_DICE_PARAMS, buildProgress: ORIGIN, buildBaseline: null }),

        loadDocument: (doc, name) =>
          set({
            crop: doc.crop,
            dice: doc.dice,
            buildProgress: doc.buildProgress,
            buildBaseline: { crop: doc.crop, dice: doc.dice },
            name,
          }),
      }),
      {
        partialize: (state): TrackedState => ({ crop: state.crop, dice: state.dice }),
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
        limit: 50,
      },
    ),
  ),
)

/** Replaces the document (load, hydrate) without leaving a history entry; seeds the derived grid from it. */
export function replaceDocument(doc: ProjectDocument, name: string): void {
  useDocumentStore.getState().loadDocument(doc, name)
  useDocumentStore.temporal.getState().clear()
  useDerivedStore.getState().reset(doc)
}

/**
 * The grid to persist: the derived grid's size, with its dice only while they were generated from the current
 * crop/tune params (after a change, and until the pipeline catches up, the dice are stale: `rows` goes null).
 */
function storedGrid(inputs: BuildBaseline, derived: Pick<DerivedState, 'gridSize' | 'gridRows' | 'gridInputs'>): StoredGrid | null {
  if (!derived.gridSize) return null
  const current = derived.gridRows !== null && gridInputsEqual(inputs, derived.gridInputs)
  return { ...derived.gridSize, rows: current ? derived.gridRows : null }
}

/**
 * The persisted document. Progress is only valid for the params it was built against: if the user changed
 * crop/tune params and hasn't re-entered the build step yet, the in-store progress is stale for these
 * params — persist 0 so a reload never lands on the wrong die of a regenerated grid.
 */
export function buildDocument(
  state: Pick<DocumentState, 'crop' | 'dice' | 'buildProgress' | 'buildBaseline'> = useDocumentStore.getState(),
  step: Step = useEditorUiStore.getState().step,
  derived: Pick<DerivedState, 'gridSize' | 'gridRows' | 'gridInputs'> = useDerivedStore.getState(),
): ProjectDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    step,
    crop: state.crop,
    dice: state.dice,
    grid: storedGrid(state, derived),
    buildProgress: progressApplies(state, state.buildBaseline) ? state.buildProgress : ORIGIN,
  }
}
