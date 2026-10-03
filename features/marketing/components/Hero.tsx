'use client'

import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import { NO_CAPTURE_CLASS, track } from '@/lib/analytics'
import { ACCEPT_ATTRIBUTE, ACCEPTED_FORMATS_LABEL, isAcceptedImage } from '@/lib/image/accept'
import { stashPendingUpload } from '@/lib/pending-upload'
import { DEFINITION } from '@/lib/schema'
import { PLAN_LIMITS } from '@/core/billing'
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
                <p className="!mb-4">Upload a photo, tune the contrast and detail, then follow our step-by-step guide to build a mosaic from standard dice.</p>
                {/* The one-sentence definition answer engines can quote (repeated in the footer). */}
                <p className="!text-base !text-[var(--text-dim)]">{DEFINITION}</p>
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
                {/* Mobile: the drop zone right under the primary CTA (desktop shows it next to the demo) */}
                <HeroUpload className="lg:hidden mt-6" />
                <div className="hero-proof">
                    <div className="hero-proof-dice">
                        {PROOF_DICE.map(({ face, color }) => (
                            <DieFace key={`${color}-${face}`} face={face} color={color} />
                        ))}
                    </div>
                    <span>
                        Built by a maker, for makers: dice portraits and gifts <strong>since 2020</strong>
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <HeroPortraits />
                <HeroUpload className="hidden lg:block" />
            </div>
        </section>
    )
}


/**
 * A real file input in the hero: the photo is parked (`lib/pending-upload.ts`) and the editor starts a project with
 * it on arrival, landing on the crop step. Keyboard: the (visually hidden) input is focusable and opens the picker;
 * the "Start creating" button stays as the other way in. Rendered twice (one per breakpoint), hence `useId`.
 */
function HeroUpload({ className = '' }: { className?: string }) {
    const router = useRouter()
    const inputId = useId()
    const [dragActive, setDragActive] = useState(false)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const takeFile = async (file: File | undefined, method: 'drop' | 'pick') => {
        if (!file || busy) return
        if (!isAcceptedImage(file)) {
            setMessage(`That file is not a photo we can read. Please use a ${ACCEPTED_FORMATS_LABEL} file.`)
            return
        }
        setBusy(true)
        setMessage('Opening the editor with your photo…')
        const stashed = await stashPendingUpload(file)
        track('hero_upload', { file_type: file.type, file_size: file.size, method })
        // Without storage the editor cannot receive the photo: it opens on its Start screen, where the picker is
        if (!stashed) setMessage('Could not hold on to that photo. Please choose it again in the editor.')
        router.push('/editor')
    }

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        void takeFile(event.target.files?.[0], 'pick')
        event.target.value = ''
    }

    const onDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!dragActive) setDragActive(true)
    }

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setDragActive(false)
        void takeFile(event.dataTransfer.files[0], 'drop')
    }

    const border = dragActive
        ? 'border-accent-pink bg-accent-pink/10'
        : 'border-white/[0.16] bg-white/[0.025] hover:border-accent-pink/50 hover:bg-white/[0.04] focus-within:border-accent-pink'

    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`rounded-[22px] border-2 border-dashed px-5 py-4 transition-colors ${border} ${busy ? 'cursor-progress' : ''} ${className}`}
        >
            <label htmlFor={inputId} className={`flex items-center gap-4 ${busy ? '' : 'cursor-pointer'}`}>
                <span className="w-12 h-12 shrink-0 rounded-2xl bg-accent-pink/[0.12] text-accent-pink flex items-center justify-center" aria-hidden>
                    <ImagePlus size={24} strokeWidth={1.8} />
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] leading-snug">
                        {dragActive ? 'Drop it here' : busy ? 'Opening the editor…' : 'Drop a photo here or choose a file'}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">{ACCEPTED_FORMATS_LABEL}</span>
                </span>
                {/* Replay records a file input's value (the file name) unmasked */}
                <input
                    id={inputId}
                    type="file"
                    accept={ACCEPT_ATTRIBUTE}
                    disabled={busy}
                    onChange={onChange}
                    className={`sr-only ${NO_CAPTURE_CLASS}`}
                />
            </label>
            {/* Spans, not <p>: `.hero p` sets a display size and a 2.5rem margin */}
            {/* Always in the DOM (a live region that appears with its first message may not be announced) */}
            <span role="status" aria-live="polite" className={`block text-sm text-[var(--pink-light)] ${message ? 'mt-2' : ''}`}>
                {message}
            </span>
        </div>
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
