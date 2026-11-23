'use client'

import BuildPositionDisplay from '@/components/BuildPositionDisplay'
import { useBuildNavigation } from '@/features/editor/hooks/useBuildNavigation'

/** The current row/col, shown between the previous/next buttons (desktop bar and mobile tool row). */
export default function BuildPosition({ className = '' }: { className?: string }) {
    const { current } = useBuildNavigation()
    return <BuildPositionDisplay row={current.y + 1} col={current.x + 1} className={className} />
}
