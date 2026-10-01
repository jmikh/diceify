'use client'

import { useState } from 'react'
import { Download, Eye, ShoppingCart, type LucideIcon } from 'lucide-react'
import { useBlueprintDownload } from '@/features/editor/hooks/useBlueprintDownload'
import ProgressPreviewModal from './ProgressPreviewModal'

const PURCHASE_DICE_URL = `https://www.amazon.com/s?${new URLSearchParams({ k: 'black and white bulk dice' })}`

export interface BuildTool {
    key: 'progress' | 'blueprint' | 'purchase'
    label: string
    icon: LucideIcon
    onSelect: () => void
}

/**
 * The build step's secondary actions — progress preview, blueprint download, purchase dice — shared by the desktop
 * inspector and the mobile "more" menu. Render `modal` once next to the tools.
 */
export function useBuildTools() {
    const [showProgress, setShowProgress] = useState(false)
    const downloadBlueprint = useBlueprintDownload()

    const tools: BuildTool[] = [
        { key: 'progress', label: 'View progress', icon: Eye, onSelect: () => setShowProgress(true) },
        { key: 'blueprint', label: 'Download blueprint', icon: Download, onSelect: downloadBlueprint },
        {
            key: 'purchase',
            label: 'Purchase dice',
            icon: ShoppingCart,
            onSelect: () => window.open(PURCHASE_DICE_URL, '_blank', 'noopener,noreferrer'),
        },
    ]
    const modal = <ProgressPreviewModal isOpen={showProgress} onClose={() => setShowProgress(false)} />
    return { tools, modal }
}
