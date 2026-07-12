import { useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useEditorStore } from '@/lib/store/useEditorStore'

// Free users (explorer plan or not signed in) can only build the first N rows
const EXPLORER_ROW_LIMIT = 5

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
    const currentIndex = currentY * totalCols + currentX

    // Check if user has unlimited dice access (any paid plan)
    const hasUnlimitedDice = useMemo(() => {
        if (!session?.user) return false
        const planType = session.user.planType || 'explorer'
        // Creator, Studio, and Lifetime all have unlimited dice
        return planType !== 'explorer'
    }, [session])

    // Helper to update position
    const setPosition = useCallback((x: number, y: number) => {
        setBuildProgress(prev => ({ ...prev, x, y }))
    }, [setBuildProgress])

    // Guard for any forward movement: without a paid plan, moving past the
    // first EXPLORER_ROW_LIMIT rows prompts anonymous users to sign in and
    // explorer users to upgrade. Returns true if the move is allowed.
    const enforceLimit = useCallback((targetIndex: number) => {
        const targetRow = Math.floor(targetIndex / totalCols)
        if (!hasUnlimitedDice && targetRow >= EXPLORER_ROW_LIMIT) {
            if (!session?.user) {
                setShowAuthModal(true)
            } else {
                setShowLimitModal(true)
            }
            return false
        }
        return true
    }, [hasUnlimitedDice, totalCols, session, setShowAuthModal, setShowLimitModal])

    const navigatePrev = useCallback(() => {
        if (currentX > 0) {
            setPosition(currentX - 1, currentY)
        } else if (currentY > 0) {
            setPosition(totalCols - 1, currentY - 1)
        }
    }, [currentX, currentY, totalCols, setPosition])

    const navigateNext = useCallback(() => {
        if (!enforceLimit(currentIndex + 1)) return

        if (currentX < totalCols - 1) {
            setPosition(currentX + 1, currentY)
        } else if (currentY < totalRows - 1) {
            setPosition(0, currentY + 1)
        }
    }, [currentX, currentY, totalCols, totalRows, setPosition, currentIndex, enforceLimit])

    // Jump directly to a dice (e.g. from clicking it in the viewer).
    // Backward jumps are always allowed; forward jumps respect the limit.
    const navigateTo = useCallback((x: number, y: number) => {
        if (x < 0 || x >= totalCols || y < 0 || y >= totalRows) return

        const targetIndex = y * totalCols + x
        if (targetIndex > currentIndex && !enforceLimit(targetIndex)) return

        setPosition(x, y)
    }, [totalCols, totalRows, currentIndex, enforceLimit, setPosition])

    const currentDice = useMemo(() => diceGrid?.dice[currentX]?.[currentY] || null, [diceGrid, currentX, currentY])

    const navigatePrevDiff = useCallback(() => {
        if (!diceGrid) return

        const currentFace = currentDice?.face
        const currentColor = currentDice?.color

        // Find previous different dice on same row first
        for (let x = currentX - 1; x >= 0; x--) {
            const dice = diceGrid.dice[x][currentY]
            if (dice.face !== currentFace || dice.color !== currentColor) {
                setPosition(x, currentY)
                return
            }
        }

        // If no different dice found on this row and not at first row, move to previous row
        if (currentY > 0) {
            setPosition(totalCols - 1, currentY - 1)
        }
    }, [currentX, currentY, currentDice, totalCols, diceGrid, setPosition])

    const navigateNextDiff = useCallback(() => {
        if (!diceGrid) return

        const currentFace = currentDice?.face
        const currentColor = currentDice?.color

        // Find next different dice on same row first
        for (let x = currentX + 1; x < totalCols; x++) {
            const dice = diceGrid.dice[x][currentY]
            if (dice.face !== currentFace || dice.color !== currentColor) {
                // Check the landing index, not the current one - a long run of
                // identical dice must not jump past the limit
                if (!enforceLimit(currentY * totalCols + x)) return
                setPosition(x, currentY)
                return
            }
        }

        // If no different dice found on this row and not at last row, move to next row
        if (currentY < totalRows - 1) {
            if (!enforceLimit((currentY + 1) * totalCols)) return
            setPosition(0, currentY + 1)
        }
    }, [currentX, currentY, currentDice, totalCols, totalRows, diceGrid, setPosition, enforceLimit])

    const canNavigate = useMemo(() => {
        if (!diceGrid) return { prev: false, next: false, prevDiff: false, nextDiff: false }

        const currentFace = currentDice?.face
        const currentColor = currentDice?.color

        const prevDiff = (() => {
            // Check if there's a different dice on the same row backward
            for (let x = currentX - 1; x >= 0; x--) {
                const dice = diceGrid.dice[x]?.[currentY]
                if (dice && (dice.face !== currentFace || dice.color !== currentColor)) {
                    return true
                }
            }
            // Or if we can move to previous row
            return currentY > 0
        })()

        const nextDiff = (() => {
            // Check if there's a different dice on the same row forward
            for (let x = currentX + 1; x < totalCols; x++) {
                const dice = diceGrid.dice[x]?.[currentY]
                if (dice && (dice.face !== currentFace || dice.color !== currentColor)) {
                    return true
                }
            }
            // Or if we can move to next row
            return currentY < totalRows - 1
        })()

        return {
            prev: currentIndex > 0,
            next: currentIndex < totalDice - 1,
            prevDiff,
            nextDiff
        }
    }, [diceGrid, currentDice, currentX, currentY, currentIndex, totalDice, totalCols, totalRows])

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
        hasUnlimitedDice, // Expose for UI
        diceLimit: hasUnlimitedDice ? Infinity : EXPLORER_ROW_LIMIT * totalCols, // Expose for UI
    }
}
