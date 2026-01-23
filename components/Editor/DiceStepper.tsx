'use client'

import { useEffect, useState, memo } from 'react'
import { WorkflowStep } from '@/lib/types'
import styles from './DiceStepper.module.css'
import { useEditorStore } from '@/lib/store/useEditorStore'

interface DiceStepperProps {
  vertical?: boolean
}

const steps: { id: WorkflowStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'crop', label: 'Crop' },
  { id: 'tune', label: 'Tune' },
  { id: 'build', label: 'Build' },
]

const DiceStepper = memo(function DiceStepper({ vertical = false }: DiceStepperProps) {
  const step = useEditorStore(state => state.step)

  return (
    <div className="flex items-center justify-center w-full max-w-full overflow-x-auto py-2">
      <div className="flex items-center min-w-max px-2">
        {steps.map((s, index) => {
          const isActive = s.id === step
          const isCompleted = steps.findIndex(st => st.id === step) > index
          const isInactive = !isActive && !isCompleted

          return (
            <div key={s.id} className="flex items-center">
              {/* Step Element */}
              <div
                className={`
                flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full
                ${isActive
                    ? 'bg-pink-500/10 border border-pink-500/50 text-white'
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
                      ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
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
                  {s.label}
                </span>
              </div>

              {/* Connecting Line (if not last) */}
              {index < steps.length - 1 && (
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