'use client'

import { Lock } from 'lucide-react'
import { track } from '@/lib/analytics'
import { useDesignLocks } from '@/features/editor/hooks/useDesignLocks'
import { useGate } from '@/features/editor/hooks/useGate'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { panel } from '../common/ui'

const WATERMARK_ID = 'design-paywall-watermark'
/** Width of "Diceify" in Syne Bold, in em (from public/logo-full.svg); pinned with `textLength` so a fallback font fits too. */
const LOGO_TEXT_EM = 4.1

/**
 * The design paywall over the tune preview while the design uses settings the plan lacks: a light watermark on the
 * art (it stays readable, so the user sees what they would get) and an upgrade button; the controls' PRO tags say
 * which setting caused it. Building is blocked by its own gate (`useStepNavigation`); the blueprint is Pro on every
 * design (`useBlueprintDownload`).
 */
export default function DesignPaywall() {
    const locks = useDesignLocks()
    const { gate } = useGate()
    const hasPreview = useDerivedStore(state => state.previewUrl !== null)
    const gridSize = useDerivedStore(state => state.gridSize)

    if (locks.length === 0 || !hasPreview || !gridSize) return null

    const upgrade = () => {
        track('click_upgrade', { source: 'design_paywall' })
        gate(false, 'upgrade')
    }

    return (
        <>
            <Watermark width={gridSize.width} height={gridSize.height} />
            <div className="absolute top-3 inset-x-3 z-20 flex justify-center pointer-events-none">
                <button
                    onClick={upgrade}
                    className={`${panel} pointer-events-auto inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium text-white/85 hover:text-white hover:border-white/20 transition-colors`}
                >
                    <Lock size={14} className="text-accent-pink-light" />
                    Remove watermark
                </button>
            </div>
        </>
    )
}

/**
 * The Diceify text logo (as in components/Logo) on a dark translucent pill, tiled diagonally over the art only: the
 * viewBox is the grid in dice, and `meet` letterboxes it exactly like the preview's `object-contain`.
 */
function Watermark({ width, height }: { width: number; height: number }) {
    const tileWidth = Math.max(width, height) / 2.4
    const tileHeight = tileWidth * 0.8
    const fontSize = tileWidth * 0.1
    const textWidth = fontSize * LOGO_TEXT_EM
    const pillWidth = textWidth + fontSize * 1.1
    const pillHeight = fontSize * 1.6
    const mark = (x: number, y: number) => (
        <g transform={`translate(${x} ${y})`} opacity={0.7}>
            <rect x={-pillWidth / 2} y={-pillHeight / 2} width={pillWidth} height={pillHeight} rx={pillHeight * 0.3} fill="#000" fillOpacity={0.4} />
            <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight={700}
                textLength={textWidth}
                style={{ fontFamily: 'var(--font-syne)' }}
            >
                <tspan fill="#fff">Dice</tspan>
                <tspan style={{ fill: 'var(--pink)' }}>ify</tspan>
            </text>
        </g>
    )

    return (
        <svg
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                {/* Brick layout: the second row is offset by half a tile (drawn at both edges, clipped to halves) */}
                <pattern id={WATERMARK_ID} width={tileWidth} height={tileHeight} patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
                    {mark(tileWidth / 2, tileHeight / 4)}
                    {mark(0, (tileHeight * 3) / 4)}
                    {mark(tileWidth, (tileHeight * 3) / 4)}
                </pattern>
            </defs>
            <rect width={width} height={height} fill={`url(#${WATERMARK_ID})`} />
        </svg>
    )
}
