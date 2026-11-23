import { useId } from 'react'

/** Width of "Diceify" in Syne Bold, in em (from public/logo-full.svg); pinned with `textLength` so a fallback font fits too. */
const LOGO_TEXT_EM = 4.1

/**
 * The design paywall's watermark: the Diceify text logo (as in components/Logo) on a dark translucent pill, tiled
 * diagonally over the art only. The viewBox is the grid in dice, and `meet` letterboxes it like an `object-contain`
 * preview; put it in a `relative` box over the art.
 */
export default function Watermark({ width, height }: { width: number; height: number }) {
    const id = useId()
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
                <pattern id={id} width={tileWidth} height={tileHeight} patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
                    {mark(tileWidth / 2, tileHeight / 4)}
                    {mark(0, (tileHeight * 3) / 4)}
                    {mark(tileWidth, (tileHeight * 3) / 4)}
                </pattern>
            </defs>
            <rect width={width} height={height} fill={`url(#${id})`} />
        </svg>
    )
}
