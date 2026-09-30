// Output of the dice pipeline (useDiceGeneration) — never persisted, always regenerable from the document
// + image. Written by the pipeline; load/upload/reset only `reset()` it.

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { DiceGrid, DiceStats, GridSize } from '@/core/dice'

export const EMPTY_STATS: DiceStats = { blackCount: 0, whiteCount: 0, totalCount: 0 }

interface DerivedState {
  grid: DiceGrid | null
  stats: DiceStats
  /** Dimensions of `grid`, or of the persisted grid after a load (before the pipeline regenerates). */
  gridSize: GridSize | null
  previewUrl: string | null
  isGenerating: boolean
  error: string | null

  startGeneration: () => void
  setGrid: (grid: DiceGrid, stats: DiceStats) => void
  finishGeneration: (previewUrl: string) => void
  failGeneration: (message: string) => void
  /** Drop everything; `gridSize` seeds the persisted grid dimensions of a loaded document. */
  reset: (gridSize: GridSize | null) => void
}

const jsonEquals = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export const useDerivedStore = create<DerivedState>()(
  subscribeWithSelector((set) => ({
    grid: null,
    stats: EMPTY_STATS,
    gridSize: null,
    previewUrl: null,
    isGenerating: false,
    error: null,

    startGeneration: () => set({ isGenerating: true, error: null }),
    setGrid: (grid, stats) =>
      set((state) => ({
        grid,
        gridSize: { width: grid.width, height: grid.height },
        // Stats are re-emitted on every run; keep the reference stable when nothing changed
        stats: jsonEquals(state.stats, stats) ? state.stats : stats,
      })),
    finishGeneration: (previewUrl) => set({ previewUrl, isGenerating: false }),
    failGeneration: (message) => set({ error: message, isGenerating: false }),
    reset: (gridSize) =>
      set({
        grid: null,
        gridSize,
        // Black/white split is recomputed when the grid regenerates; the total is known from the dimensions
        stats: gridSize ? { ...EMPTY_STATS, totalCount: gridSize.width * gridSize.height } : EMPTY_STATS,
        previewUrl: null,
        isGenerating: false,
        error: null,
      }),
  })),
)
