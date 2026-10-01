'use client'

import { useId } from 'react'
import { LucideIcon } from 'lucide-react'
import { useDocumentHistoryBatcher } from '@/features/editor/store/historyBatcher'
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
    /** Touch-friendly variant: larger thumb and track */
    large?: boolean
}

/** Label + value above a full-width range input; a pointer drag is one undo entry. */
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
    const id = useId()
    // A pointer drag is one history entry (the batcher collapses every onChange in between)
    const { startInteraction, endInteraction, batchAction } = useDocumentHistoryBatcher()

    const percent = ((value - min) / (max - min)) * 100
    const display = formatValue ? formatValue(value) : String(value)

    return (
        <div className={`flex flex-col ${large ? 'gap-3.5' : 'gap-3'}`}>
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className={`flex items-center gap-2 font-medium text-white/90 ${large ? 'text-[15px]' : 'text-sm'}`}>
                    <Icon size={16} className="text-white/60 flex-shrink-0" />
                    {label}
                </label>
                <span className="min-w-[2.25rem] text-center text-[13px] font-semibold text-white tabular-nums px-2 py-0.5 rounded-md bg-white/[0.07]">
                    {display}
                </span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => {
                    const next = parseFloat(e.target.value)
                    batchAction(() => onChange(next))
                }}
                onPointerDown={startInteraction}
                onPointerUp={endInteraction}
                onPointerCancel={endInteraction}
                className={`w-full cursor-pointer ${styles.slider} ${large ? styles.sliderLg : ''}`}
                style={{
                    background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${percent}%, rgba(255, 255, 255, 0.12) ${percent}%, rgba(255, 255, 255, 0.12) 100%)`
                }}
            />
        </div>
    )
}
