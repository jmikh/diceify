/**
 * ControlPanel Component
 * 
 * Parameter control interface for the dice art generation.
 * Think of this as the configuration panel that lets users fine-tune
 * how their image gets converted into dice art.
 * 
 * Controls provided:
 * - Grid Size: Number of dice per row (10-100)
 * - Color Mode: Black & White, Black Only, or White Only
 * - Contrast: Increases contrast (0-100, additive only)
 * - Rotation: 90° rotation for individual dice
 * - Die Size: Physical size in mm for real-world building
 * - Cost: Price calculation based on die cost
 * 
 * All parameters update in real-time and trigger re-rendering of the dice canvas.
 * The component uses controlled inputs with onChange callbacks to the parent.
 * 
 * Technical notes:
 * - Sliders use HTML5 range inputs with custom styling
 * - Color mode uses visual squares instead of dropdown for better UX
 * - Die size and cost inputs include units inside the field
 * - All inputs are debounced internally to prevent excessive re-renders
 */

'use client'

import { DiceParams, ColorMode } from '@/lib/types'
import { theme } from '@/lib/theme'
import { useState, useRef, useEffect } from 'react'
import CountUp from 'react-countup'
import { Grid3x3, Contrast, Sun, Sparkles, RotateCw, Palette } from 'lucide-react'
import { useEditorStore } from '@/lib/store/useEditorStore'
import { generateGridHash } from '@/lib/utils/paramUtils'
import { usePersistence } from '@/app/editor/hooks/usePersistence'
import styles from './TunerPanel.module.css'

// Removed interface TunerPanelProps

export default function TunerPanel() {
  const params = useEditorStore(state => state.diceParams)
  const setDiceParams = useEditorStore(state => state.setDiceParams)
  const setStep = useEditorStore(state => state.setStep)

  const diceStats = useEditorStore(state => state.diceStats)
  const { blackCount, whiteCount, totalCount } = diceStats

  const { saveTuneStep } = usePersistence()

  // Track previous values for smooth transitions
  const prevCountRef = useRef(totalCount)
  const prevBlackRef = useRef(blackCount)
  const prevWhiteRef = useRef(whiteCount)

  useEffect(() => {
    prevCountRef.current = totalCount
    prevBlackRef.current = blackCount
    prevWhiteRef.current = whiteCount
  }, [totalCount, blackCount, whiteCount])

  // Ease-out cubic function for smooth deceleration
  const easeOutCubic = (t: number, b: number, c: number, d: number) => {
    return c * ((t = t / d - 1) * t * t + 1) + b
  }

  // Initialize rotations based on current params - default to 90 degrees
  const getInitialRotation = (isRotated: boolean) => isRotated ? 0 : 90

  // Track rotation angles for animation (cumulative rotation)
  const [rotations, setRotations] = useState({
    dice2: getInitialRotation(params.rotate2),
    dice3: getInitialRotation(params.rotate3),
    dice6: getInitialRotation(params.rotate6)
  })

  // Track which sliders are being dragged
  const [isDragging, setIsDragging] = useState({
    numRows: false,
    contrast: false,
    gamma: false,
    edgeSharpening: false
  })

  const handleNumRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiceParams({ numRows: parseInt(e.target.value) })
  }

  const handleContrastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiceParams({ contrast: parseInt(e.target.value) })
  }

  const handleGammaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiceParams({ gamma: parseFloat(e.target.value) })
  }

  const handleEdgeSharpeningChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiceParams({ edgeSharpening: parseInt(e.target.value) })
  }

  const handleDiceRotation = (dice: 2 | 3 | 6) => {
    // Increment rotation angle for visual animation
    setRotations(prev => ({
      ...prev,
      [`dice${dice}`]: prev[`dice${dice}`] + 90
    }))

    // Toggle the rotation state
    if (dice === 2) {
      setDiceParams({ rotate2: !params.rotate2 })
    } else if (dice === 3) {
      setDiceParams({ rotate3: !params.rotate3 })
    } else if (dice === 6) {
      setDiceParams({ rotate6: !params.rotate6 })
    }
  }


  return (
    <>
      <div className={`space-y-6 flex-grow ${styles.scrollContainer} pr-2`}>
        {/* Stats Section - MOVED HERE */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          {/* Total dice count - at the very top */}
          <div className="text-center mb-3">
            <div className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
              <CountUp
                start={prevCountRef.current}
                end={totalCount}
                duration={1.5}
                separator=","
                useEasing={true}
                easingFn={easeOutCubic}
                preserveValue={true}
              />
            </div>
            <div className="text-xs" style={{ color: theme.colors.text.muted }}>total dice</div>
          </div>

          {/* Proportional bar */}
          <div className="h-4 rounded-lg overflow-hidden flex mb-2 border" style={{
            backgroundColor: theme.colors.glass.light,
            borderColor: 'rgba(255, 255, 255, 0.2)'
          }}>
            {totalCount > 0 && (
              <>
                <div
                  className="bg-black transition-all"
                  style={{
                    width: `${(blackCount / totalCount) * 100}%`
                  }}
                />
                <div
                  className="bg-white transition-all"
                  style={{
                    width: `${(whiteCount / totalCount) * 100}%`
                  }}
                />
              </>
            )}
          </div>

          <div className="flex justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: 'black', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
              <span style={{ color: theme.colors.text.secondary }}>
                <CountUp
                  start={prevBlackRef.current}
                  end={blackCount}
                  duration={1}
                  separator=","
                  useEasing={true}
                  easingFn={easeOutCubic}
                  preserveValue={true}
                />
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
              <span style={{ color: theme.colors.text.secondary }}>
                <CountUp
                  start={prevWhiteRef.current}
                  end={whiteCount}
                  duration={1}
                  separator=","
                  useEasing={true}
                  easingFn={easeOutCubic}
                  preserveValue={true}
                />
              </span>
            </div>
          </div>
        </div>

        {/* Color Mode - FIRST */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Color Mode</span>
          </div>

          <div
            className="flex w-full rounded-lg overflow-hidden border"
            style={{
              backgroundColor: theme.colors.glass.light,
              borderColor: theme.colors.glass.border
            }}
          >
            {/* Black & White */}
            <button
              onClick={() => setDiceParams({ colorMode: 'both' })}
              className="flex-1 h-10 flex items-center justify-center transition-all relative group"
              style={{
                boxShadow: params.colorMode === 'both' ? `inset 0 0 0 2px ${theme.colors.accent.pink}` : 'none',
                backgroundColor: 'transparent',
              }}
            >
              {/* Diagonally split square */}
              <svg width="18" height="18" viewBox="0 0 18 18" className="relative z-10">
                <path d="M1 1 L17 17 L17 1 Z" fill="white" />
                <path d="M1 1 L1 17 L17 17 Z" fill="black" />
                <rect x="0.5" y="0.5" width="17" height="17" fill="none" stroke="white" strokeWidth="1" />
              </svg>
              {/* Hover indicator */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${theme.colors.glow.pink}, transparent)`
                }}
              />
              {/* Tooltip */}
              <div
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                style={{ backgroundColor: 'rgba(10, 0, 20, 0.95)', color: 'white' }}
              >
                Mixed
              </div>
            </button>

            {/* Black Only */}
            <button
              onClick={() => setDiceParams({ colorMode: 'black' })}
              className="flex-1 h-10 flex items-center justify-center transition-all relative group"
              style={{
                boxShadow: params.colorMode === 'black' ? `inset 0 0 0 2px ${theme.colors.accent.pink}` : 'none',
                backgroundColor: 'transparent',
                borderRight: `1px solid ${theme.colors.glass.border}`
              }}
            >
              {/* Black square */}
              <div className="w-4 h-4 rounded-sm border relative z-10" style={{ backgroundColor: 'black', borderColor: 'white' }} />
              {/* Hover indicator */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${theme.colors.glow.pink}, transparent)`
                }}
              />
              {/* Tooltip */}
              <div
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                style={{ backgroundColor: 'rgba(10, 0, 20, 0.95)', color: 'white' }}
              >
                Black
              </div>
            </button>

            {/* White Only */}
            <button
              onClick={() => setDiceParams({ colorMode: 'white' })}
              className="flex-1 h-10 flex items-center justify-center transition-all relative group"
              style={{
                boxShadow: params.colorMode === 'white' ? `inset 0 0 0 2px ${theme.colors.accent.pink}` : 'none',
                backgroundColor: 'transparent'
              }}
            >
              {/* White square */}
              <div className="w-4 h-4 rounded-sm border relative z-10" style={{ backgroundColor: 'white', borderColor: 'white' }} />
              {/* Hover indicator */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${theme.colors.glow.pink}, transparent)`
                }}
              />
              {/* Tooltip */}
              <div
                className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                style={{ backgroundColor: 'rgba(10, 0, 20, 0.95)', color: 'white' }}
              >
                White
              </div>
            </button>
          </div>
        </div>

        {/* Dice Rotation - SECOND (Orientation) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <RotateCw size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Orientation</span>
          </div>

          <div
            className="flex w-full rounded-lg overflow-hidden border"
            style={{
              backgroundColor: theme.colors.glass.light,
              borderColor: theme.colors.glass.border
            }}
          >
            {/* Dice 2 */}
            <button
              onClick={() => handleDiceRotation(2)}
              className="flex-1 h-10 flex items-center justify-center transition-all hover:bg-white/10 relative group"
              style={{
                borderRight: `1px solid ${theme.colors.glass.border}`
              }}
            >
              <span
                className="inline-block transition-transform"
                style={{
                  transform: `rotate(${rotations.dice2}deg)`,
                  transformOrigin: 'center',
                  transition: 'transform 0.3s ease',
                  color: theme.colors.text.secondary,
                  fontSize: '28px',
                  lineHeight: 1
                }}
              >
                ⚁
              </span>
              {/* Hover indicator */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${theme.colors.glow.pink}, transparent)`
                }}
              />
            </button>

            {/* Dice 3 */}
            <button
              onClick={() => handleDiceRotation(3)}
              className="flex-1 h-10 flex items-center justify-center transition-all hover:bg-white/10 relative group"
              style={{
                borderRight: `1px solid ${theme.colors.glass.border}`
              }}
            >
              <span
                className="inline-block transition-transform"
                style={{
                  transform: `rotate(${rotations.dice3}deg)`,
                  transformOrigin: 'center',
                  transition: 'transform 0.3s ease',
                  color: theme.colors.text.secondary,
                  fontSize: '28px',
                  lineHeight: 1
                }}
              >
                ⚂
              </span>
              {/* Hover indicator */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${theme.colors.glow.pink}, transparent)`
                }}
              />
            </button>

            {/* Dice 6 */}
            <button
              onClick={() => handleDiceRotation(6)}
              className="flex-1 h-10 flex items-center justify-center transition-all hover:bg-white/10 relative group"
            >
              <span
                className="inline-block transition-transform"
                style={{
                  transform: `rotate(${rotations.dice6}deg)`,
                  transformOrigin: 'center',
                  transition: 'transform 0.3s ease',
                  color: theme.colors.text.secondary,
                  fontSize: '28px',
                  lineHeight: 1
                }}
              >
                ⚅
              </span>
              {/* Hover indicator */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${theme.colors.glow.pink}, transparent)`
                }}
              />
            </button>
          </div>
        </div>

        {/* Grid Size - THIRD (Start of sliders) */}
        <div className="group flex items-center gap-4">
          <div className="flex items-center gap-2 w-24 flex-shrink-0">
            <Grid3x3 size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Rows</span>
          </div>
          <div className="relative flex-grow">
            <div className="flex items-center">
              <input
                type="range"
                id="numRows"
                min="20"
                max="120"
                value={params.numRows}
                onChange={handleNumRowsChange}
                onMouseDown={() => setIsDragging({ ...isDragging, numRows: true })}
                onMouseUp={() => setIsDragging({ ...isDragging, numRows: false })}
                onTouchStart={() => setIsDragging({ ...isDragging, numRows: true })}
                onTouchEnd={() => setIsDragging({ ...isDragging, numRows: false })}
                className={`flex-1 rounded-lg cursor-pointer ${styles.slider} h-2`}
                style={{
                  background: `linear-gradient(to right, rgba(236, 72, 153, 0.5) 0%, rgba(236, 72, 153, 0.5) ${((params.numRows - 20) / 100) * 100}%, ${theme.colors.glass.border} ${((params.numRows - 20) / 100) * 100}%, ${theme.colors.glass.border} 100%)`
                }}
              />
            </div>
            {/* Tooltip positioned above slider thumb - only visible when dragging */}
            <div
              className={`absolute -top-4 px-2 py-1 text-xs rounded transition-opacity pointer-events-none whitespace-nowrap ${isDragging.numRows ? 'opacity-100' : 'opacity-0'}`}
              style={{
                left: `calc(0px + ${((params.numRows - 20) / 100) * 100}%)`,
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(10, 0, 20, 0.95)',
                color: 'white'
              }}
            >
              {params.numRows}
            </div>
          </div>
        </div>

        {/* Contrast */}
        <div className="group flex items-center gap-4">
          <div className="flex items-center gap-2 w-24 flex-shrink-0">
            <Contrast size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Contrast</span>
          </div>
          <div className="relative flex-grow">
            <div className="flex items-center">
              <input
                type="range"
                id="contrast"
                min="0"
                max="100"
                value={params.contrast}
                onChange={handleContrastChange}
                onMouseDown={() => setIsDragging({ ...isDragging, contrast: true })}
                onMouseUp={() => setIsDragging({ ...isDragging, contrast: false })}
                onTouchStart={() => setIsDragging({ ...isDragging, contrast: true })}
                onTouchEnd={() => setIsDragging({ ...isDragging, contrast: false })}
                className={`flex-1 rounded-lg cursor-pointer ${styles.slider} h-2`}
                style={{
                  background: `linear-gradient(to right, rgba(236, 72, 153, 0.5) 0%, rgba(236, 72, 153, 0.5) ${params.contrast}%, ${theme.colors.glass.border} ${params.contrast}%, ${theme.colors.glass.border} 100%)`
                }}
              />
            </div>
            {/* Tooltip positioned above slider thumb */}
            <div
              className={`absolute -top-4 px-2 py-1 text-xs rounded transition-opacity pointer-events-none whitespace-nowrap ${isDragging.contrast ? 'opacity-100' : 'opacity-0'}`}
              style={{
                left: `calc(0px + ${(params.contrast / 100) * 100}%)`,
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(10, 0, 20, 0.95)',
                color: 'white'
              }}
            >
              {params.contrast}
            </div>
          </div>
        </div>

        {/* Brightness (Gamma) */}
        <div className="group flex items-center gap-4">
          <div className="flex items-center gap-2 w-24 flex-shrink-0">
            <Sun size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Brightness</span>
          </div>
          <div className="relative flex-grow">
            <div className="flex items-center">
              <input
                type="range"
                id="gamma"
                min="0.5"
                max="1.5"
                step="0.01"
                value={params.gamma}
                onChange={handleGammaChange}
                onMouseDown={() => setIsDragging({ ...isDragging, gamma: true })}
                onMouseUp={() => setIsDragging({ ...isDragging, gamma: false })}
                onTouchStart={() => setIsDragging({ ...isDragging, gamma: true })}
                onTouchEnd={() => setIsDragging({ ...isDragging, gamma: false })}
                className={`flex-1 rounded-lg cursor-pointer ${styles.slider} h-2`}
                style={{
                  background: `linear-gradient(to right, rgba(236, 72, 153, 0.5) 0%, rgba(236, 72, 153, 0.5) ${((params.gamma - 0.5) / 1.0) * 100}%, ${theme.colors.glass.border} ${((params.gamma - 0.5) / 1.0) * 100}%, ${theme.colors.glass.border} 100%)`
                }}
              />
            </div>
            {/* Tooltip positioned above slider thumb */}
            <div
              className={`absolute -top-4 px-2 py-1 text-xs rounded transition-opacity pointer-events-none whitespace-nowrap ${isDragging.gamma ? 'opacity-100' : 'opacity-0'}`}
              style={{
                left: `calc(0px + ${((params.gamma - 0.5) / 1.0) * 100}%)`,
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(10, 0, 20, 0.95)',
                color: 'white'
              }}
            >
              {`${((params.gamma - 1.0) * 100).toFixed(0)}%`}
            </div>
          </div>
        </div>

        {/* Edge Sharpening */}
        <div className="group flex items-center gap-4">
          <div className="flex items-center gap-2 w-24 flex-shrink-0">
            <Sparkles size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Sharpening</span>
          </div>
          <div className="relative flex-grow">
            <div className="flex items-center">
              <input
                type="range"
                id="edgeSharpening"
                min="0"
                max="100"
                value={params.edgeSharpening}
                onChange={handleEdgeSharpeningChange}
                onMouseDown={() => setIsDragging({ ...isDragging, edgeSharpening: true })}
                onMouseUp={() => setIsDragging({ ...isDragging, edgeSharpening: false })}
                onTouchStart={() => setIsDragging({ ...isDragging, edgeSharpening: true })}
                onTouchEnd={() => setIsDragging({ ...isDragging, edgeSharpening: false })}
                className={`flex-1 rounded-lg cursor-pointer ${styles.slider} h-2`}
                style={{
                  background: `linear-gradient(to right, rgba(236, 72, 153, 0.5) 0%, rgba(236, 72, 153, 0.5) ${params.edgeSharpening}%, ${theme.colors.glass.border} ${params.edgeSharpening}%, ${theme.colors.glass.border} 100%)`
                }}
              />
            </div>
            {/* Tooltip positioned above slider thumb */}
            <div
              className={`absolute -top-4 px-2 py-1 text-xs rounded transition-opacity pointer-events-none whitespace-nowrap ${isDragging.edgeSharpening ? 'opacity-100' : 'opacity-0'}`}
              style={{
                left: `calc(0px + ${(params.edgeSharpening / 100) * 100}%)`,
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(10, 0, 20, 0.95)',
                color: 'white'
              }}
            >
              {params.edgeSharpening}
            </div>
          </div>
        </div>
      </div>


      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-6 pt-6 border-t border-white/10 flex-shrink-0">
        <button
          onClick={() => setStep('crop')}
          className="flex-1 py-3.5 rounded-full border border-white/10 hover:bg-white/5 text-white/70 hover:text-white font-semibold transition-all flex items-center justify-center gap-2 text-sm"
        >
          ← Back
        </button>

        <button
          onClick={() => {
            // Check if any params have changed since load/last save
            // Check if any params have changed since load/last save
            const savedParams = useEditorStore.getState().savedDiceParams

            // If we don't have saved params (new project?), treat as dirty
            let isDirty = !savedParams

            if (savedParams) {
              // Use hash comparison
              const currentHash = generateGridHash(params)
              const savedHash = generateGridHash(savedParams)

              if (currentHash !== savedHash) {
                isDirty = true
              }
            }

            if (isDirty) {
              console.log('[TUNER] Params changed, saving to DB...')
              saveTuneStep()
              // Update local saved state for dirty checking (even if DB save was skipped due to no session)
              useEditorStore.getState().setSavedTuneState(params)
              // Reset build progress in store
              useEditorStore.getState().setBuildProgress({ x: 0, y: 0, percentage: 0 })
            } else {
              console.log('[TUNER] No changes detected, skipping DB save.')
            }

            // Always proceed
            setStep('build')
          }}
          className="
            flex-1 py-3.5 rounded-full
            bg-pink-500 hover:bg-pink-600
            text-white font-semibold
            shadow-[0_0_20px_rgba(236,72,153,0.3)]
            hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]
            transition-all
            flex items-center justify-center gap-2 text-sm
          "
        >
          Continue →
        </button>
      </div>
    </>
  )
}