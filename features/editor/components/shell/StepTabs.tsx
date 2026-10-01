'use client'

import { Check } from 'lucide-react'
import { STEP_LABELS, STEPS, stepIndex } from '@/features/editor/steps'
import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'

/** Crop · Tune · Build as clickable tabs (tune/build once there is a crop); moves go through `useStepNavigation`. */
export default function StepTabs() {
    const { step, goTo, canGoTo } = useStepNavigation()
    const active = stepIndex(step)

    return (
        <nav aria-label="Editor steps" className="flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
            {STEPS.map((s, index) => {
                const isActive = s === step
                const done = index < active
                return (
                    <button
                        key={s}
                        onClick={() => !isActive && goTo(s)}
                        disabled={!canGoTo(s)}
                        aria-current={isActive ? 'step' : undefined}
                        className={`flex items-center gap-2 h-9 pl-1.5 pr-4 rounded-full border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isActive
                            ? 'border-accent-pink/55 bg-accent-pink/[0.12] text-white font-semibold'
                            : `border-transparent font-medium hover:bg-white/[0.06] ${done ? 'text-white/80' : 'text-white/60'}`
                            }`}
                    >
                        <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive
                                ? 'bg-accent-pink text-white shadow-[0_0_10px_rgb(var(--pink-rgb)/0.5)]'
                                : done
                                    ? 'bg-white/10 text-white'
                                    : 'border border-white/[0.16]'
                                }`}
                        >
                            {done ? <Check size={13} strokeWidth={2.5} /> : index + 1}
                        </span>
                        {STEP_LABELS[s]}
                    </button>
                )
            })}
        </nav>
    )
}
