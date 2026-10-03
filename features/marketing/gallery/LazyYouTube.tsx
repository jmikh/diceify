'use client'

import { useState } from 'react'

/**
 * A YouTube embed that costs one lazy thumbnail until it is clicked: the player (and its ~0.5 MB of
 * script) loads only then. 16:9, so the slot is reserved and the page does not shift.
 */
export default function LazyYouTube({ youtubeId, title, thumbnailUrl }: { youtubeId: string; title: string; thumbnailUrl: string }) {
    const [playing, setPlaying] = useState(false)

    return (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-black">
            {playing ? (
                <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label={`Play video: ${title}`}
                    className="group absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0"
                >
                    {/* Plain <img>: a remote thumbnail the static export cannot optimise; lazy so it never competes with the LCP. */}
                    <img
                        src={thumbnailUrl}
                        alt=""
                        width={480}
                        height={360}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--pink-strong)] text-white shadow-lg transition-transform group-hover:scale-105">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </span>
                    </span>
                </button>
            )}
        </div>
    )
}
