'use client'

import { ChevronLeft, ChevronRight, Download, Lock } from 'lucide-react'
import { useEntitlements } from '@/features/account/useUser'
import { useBlueprintDownload } from '@/features/editor/hooks/useBlueprintDownload'
import { useStepNavigation } from '@/features/editor/hooks/useStepNavigation'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { Inspector, InspectorSection, InspectorToolButton } from '../common/Inspector'
import { ghostButton, primaryButton } from '../common/ui'
import ColorModeControl from './controls/ColorModeControl'
import OrientationControl from './controls/OrientationControl'
import ParamSlider from './controls/ParamSlider'
import { tunerSliders, type TunerSliderConfig } from './controls/sliderConfigs'

/** One tuning slider bound to its dice param; rows past the plan's design limit are marked Pro. */
export function TunerSlider({ config, large = false }: { config: TunerSliderConfig; large?: boolean }) {
  const value = useDocumentStore(state => state.dice[config.key])
  const updateDice = useDocumentStore(state => state.updateDice)
  const { designRowLimit } = useEntitlements()
  return (
    <ParamSlider
      large={large}
      icon={config.icon}
      label={config.label}
      min={config.min}
      max={config.max}
      step={config.step}
      value={value}
      onChange={(next) => updateDice({ [config.key]: next })}
      formatValue={config.formatValue}
      proAbove={config.key === 'numRows' ? designRowLimit : null}
    />
  )
}

/**
 * Desktop inspector for the tune step: size (rows), tone (contrast, brightness, sharpening), dice colour,
 * orientation and the blueprint download. The controls are shared with the mobile toolbar (MobileTuneControls).
 */
export default function TunerPanel() {
  const { goNext, goBack, nextLocked } = useStepNavigation()
  const blueprint = useBlueprintDownload()
  const [rows, ...tone] = tunerSliders

  return (
    <Inspector
      title="Tune"
      description="Shape how the photo turns into dice."
      footer={
        <>
          <button onClick={goBack} className={`${ghostButton} h-12 pl-3 pr-4 text-sm`}>
            <ChevronLeft size={17} />
            Crop
          </button>
          <button onClick={goNext} className={`${primaryButton} h-12 flex-1 text-[15px]`}>
            Continue to Build
            {nextLocked ? <Lock size={16} /> : <ChevronRight size={18} />}
          </button>
        </>
      }
    >
        <TunerSlider config={rows} />
        <div className="flex flex-col gap-5">
          {tone.map(config => <TunerSlider key={config.key} config={config} />)}
        </div>
      <InspectorSection label="Dice colour">
        <ColorModeControl />
      </InspectorSection>
      <InspectorSection label="Orientation" hint="tap to rotate 90°">
        <OrientationControl />
      </InspectorSection>
      <InspectorSection label="Export">
        <InspectorToolButton icon={Download} label="Download HD blueprint" onClick={blueprint.download} pro={blueprint.pro} />
      </InspectorSection>
    </Inspector>
  )
}
