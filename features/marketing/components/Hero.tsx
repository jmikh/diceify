'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { track } from '@/lib/analytics'
import { DiceColorBar, GridSize } from '@/components/DiceStats'
import DiceLens, { loadLensImage } from './DiceLens'
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
                    <div className="flex flex-col items-start gap-2">
                        <Link
                            href="/editor"
                            prefetch={false}
                            className="btn-primary"
                            onClick={() => track('go_to_editor', { source: 'hero' })}
                        >
                            <DieFace face={5} color="white" className="hero-button-die" />
                            Start creating
                        </Link>
                        <span className="text-sm text-[var(--text-dim)]">Free to start — no sign-up to preview</span>
                    </div>
                    <Link
                        href="/dice-art"
                        className="hero-link"
                        onClick={() => track('hub_click', { source: 'hero' })}
                    >
                        How dice art works →
                    </Link>
                </div>
            </div>

            <HeroPortraits />
        </section>
    )
}

type Portrait = (typeof PORTRAITS)[number]

/** The dice-lens portrait, with a toggle between example subjects. */
function HeroPortraits() {
    // The toggle answers a tap at once; the portrait switches when its two images are decoded, so the tap's frame
    // never waits on a decode and the old photo never shows through the new dice.
    const [selected, setSelected] = useState(PORTRAITS[0])
    const [portrait, setPortrait] = useState(PORTRAITS[0])
    const latest = useRef(PORTRAITS[0])
    const preloaded = useRef(false)

    // Fetch every portrait once the visitor reaches for the toggle, so a switch rarely waits on the network.
    const preload = () => {
        if (preloaded.current) return
        preloaded.current = true
        for (const { id } of PORTRAITS) {
            const { dice, photo } = portraitImages(id)
            loadLensImage(dice)
            loadLensImage(photo)
        }
    }

    const choose = (next: Portrait) => {
        setSelected(next)
        latest.current = next
        const { dice, photo } = portraitImages(next.id)
        // A failed decode still switches (the frame then loads the images itself); a later tap wins.
        void Promise.allSettled([loadLensImage(dice).decode(), loadLensImage(photo).decode()]).then(() => {
            if (latest.current === next) setPortrait(next)
        })
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
                    <button key={p.id} type="button" aria-pressed={p.id === selected.id} onClick={() => choose(p)}>
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
        </figure>
    )
}
