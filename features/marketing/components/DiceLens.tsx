'use client'

import { useEffect, useRef } from 'react'
import { type ImageManifest, imageSrcSet } from '@/lib/image-variants'
import manifest from '@/lib/image-variants.manifest.json'

/** Both images fill the hero column: ~90vw on phones, 541 px on desktop (see .hero-portrait in marketing.css). */
const SIZES = '(max-width: 768px) 90vw, 541px'
const images: ImageManifest = manifest

/** Seconds for the lens to close most of the gap to the pointer (larger = lazier follow). */
const FOLLOW_SECONDS = 0.35
/** The lens stops animating once it is this close to its target (px); the next pointer move or scroll restarts it. */
const SETTLED_PX = 0.5

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

/** Start loading one of the lens images off-screen: the same srcset candidate the frame will pick. */
export function loadLensImage(src: string): HTMLImageElement {
    const image = new window.Image()
    image.sizes = SIZES
    image.srcset = imageSrcSet(src, images) ?? ''
    image.src = src
    return image
}

/**
 * Dice art with a circular lens showing the original photo underneath. The lens drifts after the pointer wherever it
 * is on the page (a finger while touching), its ring kept wholly inside the frame; it sits in the middle until the
 * pointer first moves.
 */
export default function DiceLens({ dice, photo, alt, width, height }: DiceLensProps) {
    const frameRef = useRef<HTMLDivElement>(null)
    const lensRef = useRef<HTMLDivElement>(null)
    const photoRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        const frame = frameRef.current
        const lensElement = lensRef.current
        const photoElement = photoRef.current
        if (!frame || !lensElement || !photoElement) return

        /** Last pointer position in viewport px, measured against the frame every tick so scrolling stays right. */
        let pointer: { x: number; y: number } | null = null
        /** Lens centre as a fraction of the frame; the stylesheet starts it in the middle. */
        let lens = { x: 0.5, y: 0.5 }
        let visible = false
        let lastTime = 0
        let raf = 0

        // The lens and the photo inside it move by the same amount in opposite directions, so the photo stays on the
        // dice art. Only transforms change (no layout, no repaint), and React never re-renders. The offsets are
        // percentages of each element's own size, which scales with the frame, so a resize keeps them right.
        const place = (rect: DOMRect) => {
            const size = lensElement.offsetWidth
            const dx = (lens.x - 0.5) * rect.width
            const dy = (lens.y - 0.5) * rect.height
            lensElement.style.transform = `translate(${(dx / size) * 100}%, ${(dy / size) * 100}%)`
            photoElement.style.transform = `translate(${(0.5 - lens.x) * 100}%, ${(0.5 - lens.y) * 100}%)`
        }

        const tick = (time: number) => {
            raf = 0
            if (!pointer) return
            const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0
            lastTime = time

            const rect = frame.getBoundingClientRect()
            // The centre stays a lens radius from every edge, so the ring never gets cut off.
            const rx = lensElement.offsetWidth / 2 / rect.width
            const ry = lensElement.offsetWidth / 2 / rect.height
            const target = {
                x: clamp((pointer.x - rect.left) / rect.width, rx, 1 - rx),
                y: clamp((pointer.y - rect.top) / rect.height, ry, 1 - ry),
            }
            const ease = 1 - Math.exp(-dt / FOLLOW_SECONDS)
            lens = { x: lens.x + (target.x - lens.x) * ease, y: lens.y + (target.y - lens.y) * ease }
            const settled =
                Math.abs(target.x - lens.x) * rect.width < SETTLED_PX && Math.abs(target.y - lens.y) * rect.height < SETTLED_PX
            if (settled) {
                lens = target
                lastTime = 0
            }
            place(rect)
            // Idle once caught up: an endless loop here kept every frame busy and slowed every tap on the page.
            if (!settled) raf = requestAnimationFrame(tick)
        }

        /** Restart the follow loop (no-op while it runs, before the first pointer event, or off screen). */
        const wake = () => {
            if (visible && pointer && !raf) raf = requestAnimationFrame(tick)
        }
        const trackPointer = (e: PointerEvent) => {
            pointer = { x: e.clientX, y: e.clientY }
            wake()
        }

        // Only animate while the portrait is on screen.
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            cancelAnimationFrame(raf)
            raf = 0
            lastTime = 0
            wake()
        })
        observer.observe(frame)
        window.addEventListener('pointermove', trackPointer, { passive: true })
        window.addEventListener('pointerdown', trackPointer, { passive: true })
        // Scrolling moves the frame under the (viewport) pointer position
        window.addEventListener('scroll', wake, { passive: true })
        return () => {
            observer.disconnect()
            cancelAnimationFrame(raf)
            window.removeEventListener('pointermove', trackPointer)
            window.removeEventListener('pointerdown', trackPointer)
            window.removeEventListener('scroll', wake)
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
            <div ref={lensRef} className="dice-lens-window" aria-hidden="true">
                <img
                    ref={photoRef}
                    src={photo}
                    srcSet={imageSrcSet(photo, images)}
                    sizes={SIZES}
                    alt=""
                    width={width}
                    height={height}
                    className="dice-lens-reveal"
                    // Lines the photo up with the dice art under the centred lens: half the frame's height (from the
                    // images' aspect ratio, in container widths) above the lens centre.
                    style={{ top: `calc(var(--lens-r) - ${(50 * height) / width}cqw)` }}
                />
            </div>
        </div>
    )
}
