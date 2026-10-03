'use client'

import { useEffect, useRef } from 'react'
import { type ImageManifest, imageSrcSet } from '@/lib/image-variants'
import manifest from '@/lib/image-variants.manifest.json'

/** Both images fill the hero column: ~90vw on phones, 541 px on desktop (see .hero-portrait in marketing.css). */
const SIZES = '(max-width: 768px) 90vw, 541px'
const images: ImageManifest = manifest

/** Seconds for the lens to close most of the gap to the pointer (larger = lazier follow). */
const FOLLOW_SECONDS = 0.35

interface DiceLensProps {
    /** The dice art, always visible. */
    dice: string
    /** The original photo (same framing and aspect ratio), revealed inside the lens. */
    photo: string
    alt: string
    /** Intrinsic size of both images; reserves the frame's aspect ratio before they load. */
    width: number
    height: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Dice art with a circular lens showing the original photo underneath. The lens drifts after the pointer wherever it
 * is on the page (a finger while touching), its ring kept wholly inside the frame; it sits in the middle until the
 * pointer first moves.
 */
export default function DiceLens({ dice, photo, alt, width, height }: DiceLensProps) {
    const frameRef = useRef<HTMLDivElement>(null)
    const ringRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const frame = frameRef.current
        const ring = ringRef.current
        if (!frame || !ring) return

        /** Last pointer position in viewport px, measured against the frame every tick so scrolling stays right. */
        let pointer: { x: number; y: number } | null = null
        let lens = { x: 50, y: 50 }
        let lastTime = 0
        let raf = 0

        const trackPointer = (e: PointerEvent) => {
            pointer = { x: e.clientX, y: e.clientY }
        }

        // Position goes straight to CSS variables (clip-path + ring), so the animation never re-renders React.
        const tick = (time: number) => {
            const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0
            lastTime = time

            if (pointer) {
                const rect = frame.getBoundingClientRect()
                // The center stays a ring radius (in % of each axis) from every edge, so the ring never gets cut off.
                const radius = ring.offsetWidth / 2
                const rx = (radius / frame.clientWidth) * 100
                const ry = (radius / frame.clientHeight) * 100
                const target = {
                    x: clamp(((pointer.x - rect.left) / rect.width) * 100, rx, 100 - rx),
                    y: clamp(((pointer.y - rect.top) / rect.height) * 100, ry, 100 - ry),
                }
                const ease = 1 - Math.exp(-dt / FOLLOW_SECONDS)
                lens = { x: lens.x + (target.x - lens.x) * ease, y: lens.y + (target.y - lens.y) * ease }
                frame.style.setProperty('--lens-x', `${lens.x}%`)
                frame.style.setProperty('--lens-y', `${lens.y}%`)
            }

            raf = requestAnimationFrame(tick)
        }

        // Only animate while the portrait is on screen.
        const observer = new IntersectionObserver(([entry]) => {
            cancelAnimationFrame(raf)
            if (entry.isIntersecting) {
                lastTime = 0
                raf = requestAnimationFrame(tick)
            }
        })
        observer.observe(frame)
        window.addEventListener('pointermove', trackPointer, { passive: true })
        window.addEventListener('pointerdown', trackPointer, { passive: true })
        return () => {
            observer.disconnect()
            cancelAnimationFrame(raf)
            window.removeEventListener('pointermove', trackPointer)
            window.removeEventListener('pointerdown', trackPointer)
        }
    }, [])

    return (
        <div ref={frameRef} className="dice-lens">
            {/* The dice art is the hero visual: fetch it first. The photo shows through the lens from the first paint
                (the lens starts in the middle), so it stays eager, but at default priority: it must not compete with
                the dice or the LCP text. */}
            <img
                src={dice}
                srcSet={imageSrcSet(dice, images)}
                sizes={SIZES}
                alt={alt}
                width={width}
                height={height}
                className="dice-lens-base"
                fetchPriority="high"
            />
            <img
                src={photo}
                srcSet={imageSrcSet(photo, images)}
                sizes={SIZES}
                alt=""
                width={width}
                height={height}
                className="dice-lens-reveal"
            />
            <div ref={ringRef} className="dice-lens-ring" aria-hidden="true" />
        </div>
    )
}
