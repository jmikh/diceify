import { useMemo } from 'react'
import { buildIndex } from '@/core/dice'
import { useDerivedStore } from '../store/useDerivedStore'
import { useDocumentStore } from '../store/useDocumentStore'

/** Build position as an index/percentage — the one place this is computed. */
export function useBuildProgress() {
  const progress = useDocumentStore((s) => s.buildProgress)
  const gridSize = useDerivedStore((s) => s.gridSize)
  return useMemo(() => {
    const width = gridSize?.width ?? 0
    const totalDice = width * (gridSize?.height ?? 0)
    const currentIndex = buildIndex(progress, width)
    return { currentIndex, totalDice, percent: totalDice > 0 ? (currentIndex / totalDice) * 100 : 0 }
  }, [progress, gridSize])
}
