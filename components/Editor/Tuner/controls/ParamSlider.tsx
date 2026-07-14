'use client'

import { useState } from 'react'
import { LucideIcon } from 'lucide-react'
import { theme } from '@/lib/theme'
import styles from './ParamSlider.module.css'

interface ParamSliderProps {
    icon: LucideIcon
    label: string
    min: number
    max: number
    step?: number
    value: number
    onChange: (value: number) => void
    formatValue?: (value: number) => string
    /** Touch-friendly variant: label/value row above a full-width slider with a large thumb */
    large?: boolean
}

export default function ParamSlider({
    icon: Icon,
    label,
    min,
    max,
    step = 1,
    value,
    onChange,
    formatValue,
    large = false
}: ParamSliderProps) {
    const [isDragging, setIsDragging] = useState(false)

    const percent = ((value - min) / (max - min)) * 100
    const display = formatValue ? formatValue(value) : String(value)

    const input = (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className={`w-full rounded-lg cursor-pointer ${styles.slider} ${large ? `${styles.sliderLg} h-3` : 'h-2'}`}
            style={{
                background: `linear-gradient(to right, rgba(236, 72, 153, 0.5) 0%, rgba(236, 72, 153, 0.5) ${percent}%, ${theme.colors.glass.border} ${percent}%, ${theme.colors.glass.border} 100%)`
            }}
        />
    )

    if (large) {
        return (
            <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Icon size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
                        <span className="text-[11px] font-medium text-gray-300 uppercase tracking-wider">{label}</span>
                    </div>
                    <span className="text-base font-semibold text-white tabular-nums">{display}</span>
                </div>
                {input}
            </div>
        )
    }

    return (
        <div className="group flex items-center gap-4">
            <div className="flex items-center gap-2 w-24 flex-shrink-0">
                <Icon size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
                <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">{label}</span>
            </div>
            <div className="relative flex-grow">
                <div className="flex items-center">
                    {input}
                </div>
                {/* Tooltip positioned above slider thumb - only visible when dragging */}
                <div
                    className={`absolute -top-4 px-2 py-1 text-xs rounded transition-opacity pointer-events-none whitespace-nowrap ${isDragging ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                        left: `calc(0px + ${percent}%)`,
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(10, 0, 20, 0.95)',
                        color: 'white'
                    }}
                >
                    {display}
                </div>
            </div>
        </div>
    )
}
