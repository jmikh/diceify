'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import type { DiceColor, DiceFace } from '@/core/dice'
import { DiceColorBar, GridSize } from '@/components/DiceStats'
import DiceLens from './DiceLens'
import DieFace from './DieFace'

// Each portrait is `/images/hero/{id}-dice.webp` + `{id}-photo.webp`. A pair must share framing (the lens shows the
// photo exactly where the dice are), and every portrait this size so the frame doesn't jump when switching.
const PORTRAIT_SIZE = { width: 1240, height: 1096 }

// `grid` and the counts are the dice visible in `{id}-dice.webp` (measured from the image); update them with the image.
const PORTRAITS = [
    {
        id: 'kids',
        label: 'Kids',
        alt: 'Portrait of a smiling boy turned into dice art',
        grid: { width: 87, height: 77 },
        blackCount: 4564,
        whiteCount: 2135,
    },
    {
        id: 'pets',
        label: 'Pets',
        alt: 'Portrait of a tabby cat turned into dice art',
        grid: { width: 75, height: 65 },
        blackCount: 2093,
        whiteCount: 2782,
    },
    {
        id: 'couples',
        label: 'Couples',
        alt: 'Portrait of a smiling couple turned into dice art',
        grid: { width: 81, height: 71 },
        blackCount: 3110,
        whiteCount: 2641,
    },
]

const portraitImages = (id: string) => ({ dice: `/images/hero/${id}-dice.webp`, photo: `/images/hero/${id}-photo.webp` })

const PROOF_DICE: { face: DiceFace; color: DiceColor }[] = [
    { face: 6, color: 'black' },
    { face: 3, color: 'black' },
    { face: 4, color: 'white' },
    { face: 1, color: 'white' },
]

export default function Hero() {
    return (
        <section className="hero">
            <div className="hero-content">
                <span className="hero-badge">
                    <img src="/favicon.svg" alt="" className="hero-badge-icon" />
                    Photo-to-dice mosaic generator
                </span>
                <h1>Turn loved ones into <span className="highlight">dice art</span></h1>
                <p>Upload a photo, tune the contrast and detail, then follow our step-by-step guide to build a mosaic from standard dice.</p>
                <div className="hero-buttons">
                    <Link
                        href="/editor"
                        className="btn-primary"
                        onClick={() => track('go_to_editor', { source: 'hero' })}
                    >
                        <DieFace face={5} color="white" className="hero-button-die" />
                        Start creating
                    </Link>
                    <Link
                        href="/dice-art"
                        className="hero-link"
                        onClick={() => track('hub_click', { source: 'hero' })}
                    >
                        How dice art works →
                    </Link>
                </div>
                <div className="hero-proof">
                    <div className="hero-proof-dice">
                        {PROOF_DICE.map(({ face, color }) => (
                            <DieFace key={`${color}-${face}`} face={face} color={color} />
                        ))}
                    </div>
                    <span>
                        Join <strong>5,000+</strong> creators building with real dice
                    </span>
                </div>
            </div>

            <HeroPortraits />
        </section>
    )
}

/** The dice-lens portrait, with a toggle between example subjects. */
function HeroPortraits() {
    const [portrait, setPortrait] = useState(PORTRAITS[0])
    const preloaded = useRef(false)

    // Fetch every portrait once the visitor reaches for the toggle, so a switch doesn't show the old photo
    // through the new dice while the images load.
    const preload = () => {
        if (preloaded.current) return
        preloaded.current = true
        for (const { id } of PORTRAITS) {
            const { dice, photo } = portraitImages(id)
            new window.Image().src = dice
            new window.Image().src = photo
        }
    }

    return (
        <figure className="hero-visual">
            <div
                role="group"
                aria-label="Example portrait"
                className="hero-portrait-toggle"
                onPointerEnter={preload}
                onFocus={preload}
            >
                {PORTRAITS.map(p => (
                    <button key={p.id} type="button" aria-pressed={p.id === portrait.id} onClick={() => setPortrait(p)}>
                        {p.label}
                    </button>
                ))}
            </div>
            <DiceLens {...portraitImages(portrait.id)} alt={portrait.alt} {...PORTRAIT_SIZE} />
            <div className="hero-portrait-stats">
                <GridSize {...portrait.grid} />
                <div className="hero-portrait-split">
                    <DiceColorBar blackCount={portrait.blackCount} whiteCount={portrait.whiteCount} barClassName="flex-1" />
                </div>
            </div>
            <figcaption>Move across the dice: the lens shows the original photo.</figcaption>
        </figure>
    )
}
