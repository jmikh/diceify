import { LucideIcon, Grid3x3, Contrast, Sun, Sparkles } from 'lucide-react'

export interface TunerSliderConfig {
    key: 'numRows' | 'contrast' | 'gamma' | 'edgeSharpening'
    icon: LucideIcon
    label: string
    min: number
    max: number
    step: number
    formatValue?: (value: number) => string
}

// Single source of truth for the tuning sliders, shared by the desktop
// panel and the mobile toolbar
export const tunerSliders: TunerSliderConfig[] = [
    { key: 'numRows', icon: Grid3x3, label: 'Rows', min: 20, max: 120, step: 1 },
    { key: 'contrast', icon: Contrast, label: 'Contrast', min: 0, max: 100, step: 1 },
    { key: 'gamma', icon: Sun, label: 'Brightness', min: 0.5, max: 1.5, step: 0.01, formatValue: (v) => `${((v - 1.0) * 100).toFixed(0)}%` },
    { key: 'edgeSharpening', icon: Sparkles, label: 'Sharpening', min: 0, max: 100, step: 1 },
]
