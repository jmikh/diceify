/**
 * TunerPanel Component
 *
 * Desktop sidebar with the parameter controls for dice art generation:
 * dice stats, color mode, dice orientation and the tuning sliders
 * (rows, contrast, brightness, sharpening).
 *
 * The individual controls live in ./controls and are shared with the
 * mobile toolbar (MobileTuneControls).
 */

'use client'

import { RotateCw, Palette } from 'lucide-react'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'
import DiceStatsCard from '../DiceStatsCard'
import ColorModeControl from './controls/ColorModeControl'
import OrientationControl from './controls/OrientationControl'
import ParamSlider from './controls/ParamSlider'
import { tunerSliders } from './controls/sliderConfigs'
import styles from './TunerPanel.module.css'

export default function TunerPanel() {
  const params = useEditorStore(state => state.diceParams)
  const setDiceParams = useEditorStore(state => state.setDiceParams)
  const setStep = useEditorStore(state => state.setStep)

  return (
    <>
      <div className={`space-y-6 flex-grow ${styles.scrollContainer} pr-2`}>
        {/* Stats Section */}
        <DiceStatsCard />

        {/* Color Mode */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Color Mode</span>
          </div>
          <ColorModeControl />
        </div>

        {/* Dice Rotation (Orientation) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <RotateCw size={16} style={{ color: theme.colors.text.secondary, flexShrink: 0 }} />
            <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">Orientation</span>
          </div>
          <OrientationControl />
        </div>

        {/* Tuning sliders */}
        {tunerSliders.map(config => (
          <ParamSlider
            key={config.key}
            icon={config.icon}
            label={config.label}
            min={config.min}
            max={config.max}
            step={config.step}
            value={params[config.key]}
            onChange={(value) => setDiceParams({ [config.key]: value })}
            formatValue={config.formatValue}
          />
        ))}
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
          onClick={() => useEditorStore.getState().enterBuild()}
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
