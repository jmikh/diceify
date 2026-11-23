'use client'

import { useId } from 'react'
import { LucideIcon } from 'lucide-react'
import { useDocumentHistoryBatcher } from '@/features/editor/store/historyBatcher'
import ProBadge from '../../common/ProBadge'
import styles from './ParamSlider.module.css'

const TRACK = 'linear-gradient(rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.12))'
const PRO_TRACK = 'repeating-linear-gradient(to right, rgb(var(--pink-rgb) / 0.6) 0 4px, transparent 4px 7px)'

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
    /** Values above this need a paid plan: a PRO tag by the label and a dashed track past it (null = none). */
    proAbove?: number | null
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
    large = false,
    proAbove = null
}: ParamSliderProps) {
    const id = useId()
    // A pointer drag is one history entry (the batcher collapses every onChange in between)
    const { startInteraction, endInteraction, batchAction } = useDocumentHistoryBatcher()

    const toPercent = (v: number) => ((v - min) / (max - min)) * 100
    const percent = toPercent(value)
    const display = formatValue ? formatValue(value) : String(value)
    const pro = proAbove !== null && proAbove < max ? proAbove : null

    // Track layers, top first: the fill up to the value, the dashed Pro zone (right of `pro`), the bare track
    const layers = [
        { image: `linear-gradient(to right, var(--pink) ${percent}%, transparent ${percent}%)`, width: 100 },
        ...(pro !== null ? [{ image: PRO_TRACK, width: 100 - toPercent(pro) }] : []),
        { image: TRACK, width: 100 },
    ]

    return (
        <div className={`flex flex-col ${large ? 'gap-3.5' : 'gap-3'}`}>
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={id} className={`flex items-center gap-2 font-medium text-white/90 ${large ? 'text-[15px]' : 'text-sm'}`}>
                    <Icon size={16} className="text-white/60 flex-shrink-0" />
                    {label}
                    {pro !== null && <ProBadge>PRO over {pro}</ProBadge>}
                </label>
                <span className="min-w-[2.25rem] text-center text-[13px] font-semibold text-white tabular-nums px-2 py-0.5 rounded-md bg-white/[0.07]">
                    {display}
                </span>
            </div>
            {/* aria-label repeats the <label> so PostHog autocapture names the change event after the slider */}
            <input
                id={id}
                aria-label={label}
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
                    backgroundImage: layers.map(layer => layer.image).join(', '),
                    backgroundSize: layers.map(layer => `${layer.width}% 100%`).join(', '),
                    backgroundPosition: 'right',
                    backgroundRepeat: 'no-repeat',
                }}
            />
        </div>
    )
}
