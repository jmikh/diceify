import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { PLAN_LIMITS } from '@/core/billing'
import { buildTargets, moveTo, type BuildGate } from '@/features/editor/store/buildNavigation'
import { useBuildProgress } from '@/features/editor/hooks/useBuildProgress'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'

/**
 * The row-limit gate for build navigation: signed-out users count as explorers; past the limit, anonymous
 * users are prompted to sign in and explorers to upgrade. C2 derives this from entitlements instead.
 */
export function useBuildGate(): BuildGate {
    const { data: session } = useSession()
    const openModal = useEditorUiStore(state => state.openModal)
    return useMemo(() => {
        const planType = session?.user?.planType || 'explorer'
        return {
            rowLimit: planType !== 'explorer' ? null : PLAN_LIMITS.explorer.builderRowLimit,
            onBlocked: () => openModal(session?.user ? 'limit' : 'signIn'),
        }
    }, [session, openModal])
}

/** Build position, what is reachable from it and the bound navigation actions (see store/buildNavigation). */
export function useBuildNavigation() {
    const gate = useBuildGate()
    const grid = useDerivedStore(state => state.grid)
    const current = useDocumentStore(state => state.buildProgress)
    const { percent } = useBuildProgress()

    const targets = useMemo(() => buildTargets(grid, current), [grid, current])
    const currentDie = grid?.rows[current.y]?.[current.x] ?? null

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
