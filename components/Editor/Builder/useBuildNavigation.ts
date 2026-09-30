import { useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { PLAN_LIMITS } from '@/core/billing'
import {
    buildIndex,
    findNextDiff,
    findPrevDiff,
    nextPosition,
    prevPosition,
    rowLimitAllows,
    type GridPos,
} from '@/core/dice'
import { useEditorStore } from '@/lib/store/useEditorStore'

export function useBuildNavigation() {
    const { data: session } = useSession()
    const diceGrid = useEditorStore(state => state.diceGrid)
    const buildProgress = useEditorStore(state => state.buildProgress)
    const setBuildProgress = useEditorStore(state => state.setBuildProgress)
    const setShowAuthModal = useEditorStore(state => state.setShowAuthModal)
    const setShowLimitModal = useEditorStore(state => state.setShowLimitModal)

    const currentX = buildProgress.x
    const currentY = buildProgress.y
    const totalCols = diceGrid?.width || 0
    const totalRows = diceGrid?.height || 0
    const totalDice = totalCols * totalRows
    const currentIndex = buildIndex(buildProgress, totalCols)

    // Rows a user may build; null = unlimited (any paid plan). Signed-out users
    // count as explorers. C2 derives this from entitlements instead of the session.
    const rowLimit = useMemo(() => {
        const planType = session?.user?.planType || 'explorer'
        return planType !== 'explorer' ? null : PLAN_LIMITS.explorer.builderRowLimit
    }, [session])

    const setPosition = useCallback((pos: GridPos) => {
        setBuildProgress(prev => ({ ...prev, x: pos.x, y: pos.y }))
    }, [setBuildProgress])

    // Guard for any forward movement: past the row limit, anonymous users are
    // prompted to sign in and explorer users to upgrade. Returns true if the
    // move is allowed.
    const enforceLimit = useCallback((target: GridPos) => {
        if (rowLimitAllows(target, rowLimit)) return true
        if (!session?.user) {
            setShowAuthModal(true)
        } else {
            setShowLimitModal(true)
        }
        return false
    }, [rowLimit, session, setShowAuthModal, setShowLimitModal])

    const navigatePrev = useCallback(() => {
        const target = prevPosition(buildProgress, totalCols)
        if (target) setPosition(target)
    }, [buildProgress, totalCols, setPosition])

    const navigateNext = useCallback(() => {
        const target = nextPosition(buildProgress, totalCols, totalRows)
        if (target && enforceLimit(target)) setPosition(target)
    }, [buildProgress, totalCols, totalRows, enforceLimit, setPosition])

    // Jump directly to a dice (e.g. from clicking it in the viewer).
    // Backward jumps are always allowed; forward jumps respect the limit.
    const navigateTo = useCallback((x: number, y: number) => {
        if (x < 0 || x >= totalCols || y < 0 || y >= totalRows) return

        const target = { x, y }
        if (buildIndex(target, totalCols) > currentIndex && !enforceLimit(target)) return

        setPosition(target)
    }, [totalCols, totalRows, currentIndex, enforceLimit, setPosition])

    const currentDice = useMemo(() => diceGrid?.rows[currentY]?.[currentX] || null, [diceGrid, currentX, currentY])

    // Diff jumps are row-local: the previous/next dice on this row that differs
    // from the current one. When the rest of the row is identical they fall
    // through to the far end of the adjacent row. null = nowhere to go.
    const prevDiffTarget = useMemo<GridPos | null>(() => {
        if (!diceGrid) return null
        const x = currentDice ? findPrevDiff(diceGrid.rows[currentY], currentX) : null
        if (x !== null) return { x, y: currentY }
        return currentY > 0 ? { x: totalCols - 1, y: currentY - 1 } : null
    }, [diceGrid, currentDice, currentX, currentY, totalCols])

    const nextDiffTarget = useMemo<GridPos | null>(() => {
        if (!diceGrid) return null
        const x = currentDice ? findNextDiff(diceGrid.rows[currentY], currentX) : null
        if (x !== null) return { x, y: currentY }
        return currentY < totalRows - 1 ? { x: 0, y: currentY + 1 } : null
    }, [diceGrid, currentDice, currentX, currentY, totalRows])

    const navigatePrevDiff = useCallback(() => {
        if (prevDiffTarget) setPosition(prevDiffTarget)
    }, [prevDiffTarget, setPosition])

    const navigateNextDiff = useCallback(() => {
        // Check the landing position, not the current one - a long run of
        // identical dice must not jump past the limit
        if (nextDiffTarget && enforceLimit(nextDiffTarget)) setPosition(nextDiffTarget)
    }, [nextDiffTarget, enforceLimit, setPosition])

    const canNavigate = useMemo(() => {
        if (!diceGrid) return { prev: false, next: false, prevDiff: false, nextDiff: false }
        return {
            prev: currentIndex > 0,
            next: currentIndex < totalDice - 1,
            prevDiff: prevDiffTarget !== null,
            nextDiff: nextDiffTarget !== null,
        }
    }, [diceGrid, currentIndex, totalDice, prevDiffTarget, nextDiffTarget])

    return {
        navigatePrev,
        navigateNext,
        navigatePrevDiff,
        navigateNextDiff,
        navigateTo,
        canNavigate,
        currentDice,
        currentX,
        currentY,
        totalCols,
        totalRows,
        totalDice,
        currentIndex,
    }
}
