import { useMemo } from 'react'
import { findRun } from '@/core/dice'
import { buildTargets, moveTo, type BuildGate } from '@/features/editor/store/buildNavigation'
import { useBuildProgress } from '@/features/editor/hooks/useBuildProgress'
import { useGate } from '@/features/editor/hooks/useGate'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'

/**
 * The row-limit gate for build navigation (`moveTo` applies `rowLimitAllows`): past the limit, anonymous
 * users are prompted to sign in and explorers get the limit modal.
 */
export function useBuildGate(): BuildGate {
    const { ent, gate } = useGate()
    return useMemo(() => ({
        rowLimit: ent.builderRowLimit,
        onBlocked: () => { gate(false, 'build_limit', { modal: 'limit' }) },
    }), [ent.builderRowLimit, gate])
}

/** Build position, what is reachable from it and the bound navigation actions (see store/buildNavigation). */
export function useBuildNavigation() {
    const gate = useBuildGate()
    const grid = useDerivedStore(state => state.grid)
    const current = useDocumentStore(state => state.buildProgress)
    const { percent } = useBuildProgress()

    const targets = useMemo(() => buildTargets(grid, current), [grid, current])
    const currentDie = grid?.rows[current.y]?.[current.x] ?? null
    // The run of identical dice the selector is in (viewer rectangle + badges, panel copy)
    const run = useMemo(
        () => (grid && currentDie ? findRun(grid.rows[current.y], current.x) : null),
        [grid, currentDie, current.x, current.y]
    )

    const actions = useMemo(() => ({
        navigatePrev: () => moveTo(targets.prev, gate),
        navigateNext: () => moveTo(targets.next, gate),
        navigatePrevDiff: () => moveTo(targets.prevDiff, gate),
        navigateNextDiff: () => moveTo(targets.nextDiff, gate),
        /** Jump to a die (e.g. clicked in the viewer); forward jumps respect the limit. */
        navigateTo: (x: number, y: number) => moveTo({ x, y }, gate),
    }), [targets, gate])

    return {
        current,
        currentDie,
        run,
        percent,
        canNavigate: {
            prev: targets.prev !== null,
            next: targets.next !== null,
            prevDiff: targets.prevDiff !== null,
            nextDiff: targets.nextDiff !== null,
        },
        ...actions,
    }
}
