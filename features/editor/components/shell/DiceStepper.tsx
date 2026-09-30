'use client'

import { memo } from 'react'
import { STEP_LABELS, STEPS, stepIndex } from '@/features/editor/steps'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'

const DiceStepper = memo(function DiceStepper() {
  const step = useEditorUiStore(state => state.step)
  const activeIndex = stepIndex(step)

  return (
    <div className="flex items-center justify-center w-full max-w-full overflow-x-auto py-2">
      <div className="flex items-center min-w-max px-2">
        {STEPS.map((s, index) => {
          const isActive = s === step
          const isCompleted = activeIndex > index

          return (
            <div key={s} className="flex items-center">
              {/* Step Element */}
              <div
                className={`
                flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full
                ${isActive
                    ? 'bg-accent-pink/10 border border-accent-pink/50 text-white'
                    : isCompleted
                      ? 'text-white/60'
                      : 'text-white/30'
                  }
              `}
              >
                {/* Number Circle */}
                <div
                  className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${isActive
                      ? 'bg-accent-pink text-white shadow-[0_0_10px_rgb(var(--pink-rgb)/0.5)]'
                      : isCompleted
                        ? 'bg-white/10 text-white/60'
                        : 'bg-white/5 text-white/30 border border-white/5'
                    }
                `}
                >
                  {index + 1}
                </div>

                {/* Label - Hide inactive labels on mobile to save space */}
                <span className={`text-sm font-medium ${isActive ? 'text-pink-100 block' : 'hidden sm:block'}`}>
                  {STEP_LABELS[s]}
                </span>
              </div>

              {/* Connecting Line (if not last) */}
              {index < STEPS.length - 1 && (
                <div className={`w-8 h-[1px] mx-2 ${isCompleted ? 'bg-white/20' : 'bg-white/5'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default DiceStepper