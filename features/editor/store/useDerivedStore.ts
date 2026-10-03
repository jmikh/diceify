// Output of the dice pipeline (useDicePipeline): the grid (+ its encoded rows, persisted as `document.grid.rows`
// since schema v2), stats, preview and thumbnail. Written by the pipeline; load/upload/reset only `reset()` it, which
// seeds the grid from a loaded document so the build step renders the stored grid at once (and the pipeline keeps it
// as long as the crop/tune params it was generated from are unchanged).

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { computeStats, decodeStoredGrid, encodeGrid, type DiceGrid, type DiceStats, type GridInputs, type GridSize, type ProjectDocument } from '@/core/dice'
import { reportError } from '@/lib/report-error'
import type { Thumbnail } from '@/lib/image/decode'

export const EMPTY_STATS: DiceStats = { blackCount: 0, whiteCount: 0, totalCount: 0 }

export interface DerivedState {
  grid: DiceGrid | null
  stats: DiceStats
  /** Dimensions of `grid`, or of the persisted grid after a load (before the pipeline regenerates). */
  gridSize: GridSize | null
  /** `grid` encoded for the document (once per generation); null without a grid. */
  gridRows: string[] | null
  /** The crop/tune params `grid` was generated from; null without a grid. */
  gridInputs: GridInputs | null
  previewUrl: string | null
  /** The cropped photo, small: the project thumbnail. */
  thumbnail: Thumbnail | null
  isGenerating: boolean
  error: string | null

  startGeneration: () => void
  setGrid: (grid: DiceGrid, stats: DiceStats, inputs: GridInputs) => void
  finishGeneration: (previewUrl: string) => void
  setThumbnail: (thumbnail: Thumbnail) => void
  failGeneration: (message: string) => void
  /** Drop everything; a loaded document seeds the grid (size, and the dice when it carries `rows`). */
  reset: (doc: Pick<ProjectDocument, 'grid' | 'crop' | 'dice'> | null) => void
}

type Seed = Pick<DerivedState, 'grid' | 'stats' | 'gridSize' | 'gridRows' | 'gridInputs'>

const EMPTY_SEED: Seed = { grid: null, stats: EMPTY_STATS, gridSize: null, gridRows: null, gridInputs: null }

/** What a loaded document already knows about its grid. A corrupt `rows` (should be impossible: validated) is reported and ignored. */
function seedFrom(doc: Pick<ProjectDocument, 'grid' | 'crop' | 'dice'> | null): Seed {
  if (!doc?.grid) return EMPTY_SEED
  const gridSize = { width: doc.grid.width, height: doc.grid.height }
  try {
    const grid = decodeStoredGrid(doc.grid)
    if (grid) {
      return { grid, stats: computeStats(grid), gridSize, gridRows: doc.grid.rows, gridInputs: { crop: doc.crop, dice: doc.dice } }
    }
  } catch (error) {
    reportError(error, { where: 'derived-seed' })
  }
  // Black/white split is recomputed when the grid regenerates; the total is known from the dimensions
  return { ...EMPTY_SEED, gridSize, stats: { ...EMPTY_STATS, totalCount: gridSize.width * gridSize.height } }
}

const jsonEquals = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export const useDerivedStore = create<DerivedState>()(
  subscribeWithSelector((set) => ({
    ...EMPTY_SEED,
    previewUrl: null,
    thumbnail: null,
    isGenerating: false,
    error: null,

    startGeneration: () => set({ isGenerating: true, error: null }),
    setGrid: (grid, stats, inputs) =>
      set((state) => ({
        grid,
        gridSize: { width: grid.width, height: grid.height },
        gridRows: encodeGrid(grid),
        gridInputs: inputs,
        // Stats are re-emitted on every run; keep the reference stable when nothing changed
        stats: jsonEquals(state.stats, stats) ? state.stats : stats,
      })),
    finishGeneration: (previewUrl) => set({ previewUrl, isGenerating: false }),
    setThumbnail: (thumbnail) => set((state) => (state.thumbnail === thumbnail ? state : { thumbnail })),
    failGeneration: (message) => set({ error: message, isGenerating: false }),
    reset: (doc) =>
      set({
        ...seedFrom(doc),
        previewUrl: null,
        thumbnail: null,
        isGenerating: false,
        error: null,
      }),
  })),
)
