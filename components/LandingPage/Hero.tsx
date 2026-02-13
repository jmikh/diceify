'use client'

import Link from 'next/link'
import { sendGAEvent } from '@next/third-parties/google'
import Image from 'next/image'

export default function Hero() {
    return (
        <section className="hero hero--centered">
            <div className="hero-content text-center mx-auto">
                <div className="flex flex-col items-center gap-4 mb-4">
                    <Image
                        src="/favicon-192x192.png"
                        alt="Diceify"
                        width={192}
                        height={192}
                        style={{ width: '5rem', height: '5rem' }}
                    />
                    <h1 className="!mb-0">Turn photos into <span className="highlight">dice art</span></h1>
                </div>
                <p className="mx-auto">Upload a photo, tune the contrast and detail, then follow our step-by-step guide to build stunning mosaic art using standard dice.</p>
                <div className="hero-buttons justify-center">
                    <Link
                        href="/editor"
                        className="btn-primary"
                        onClick={() => sendGAEvent('event', 'go_to_editor', { source: 'hero' })}
                    >
                        Start creating
                    </Link>
                </div>
                <Link
                    href="/dice-art"
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors no-underline"
                    onClick={() => sendGAEvent('event', 'hub_click', { source: 'hero' })}
                >
                    or learn about dice art →
                </Link>
                <div className="flex items-center justify-center gap-3 mt-6">
                    <div className="flex -space-x-2">
                        {['from-pink-500 to-purple-600', 'from-blue-400 to-cyan-500', 'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-600', 'from-violet-400 to-indigo-500'].map((gradient, i) => (
                            <div
                                key={i}
                                className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} border-2 border-[var(--bg-primary)] flex items-center justify-center`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" opacity="0.8">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M20 21a8 8 0 1 0-16 0" />
                                </svg>
                            </div>
                        ))}
                    </div>
                    <span className="text-sm text-[var(--text-muted)]">
                        Join <strong className="text-[var(--text-primary)]">5,000+</strong> happy creators
                    </span>
                </div>
            </div>

            {/* Demo video */}
            <div className="glass" style={{ padding: '0.5rem', maxWidth: '800px', width: '100%' }}>
                <video
                    src="/demo-optimized.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    style={{ width: '100%', borderRadius: '1rem', display: 'block' }}
                />
            </div>

            {/* Decorative glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/15 blur-[120px] rounded-full -z-10 pointer-events-none" />
        </section>
    )
}
