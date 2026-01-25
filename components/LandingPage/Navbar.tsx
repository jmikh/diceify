'use client'

import Link from 'next/link'
import { sendGAEvent } from '@next/third-parties/google'

export default function Navbar() {
    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 p-3 px-4 flex justify-between items-center gap-12 z-[100] bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-full whitespace-nowrap">
            <div className="font-syne font-bold text-xl tracking-tight pl-3">
                Dice<span className="text-[var(--pink)]">ify</span>
            </div>
            <ul className="hidden md:flex gap-2 list-none">
                <li>
                    <Link href="#how" className="text-[var(--text-muted)] text-sm font-medium px-4 py-2 rounded-full transition-all hover:text-white hover:bg-white/5 no-underline">
                        How it works
                    </Link>
                </li>
                <li>
                    <Link href="#gallery" className="text-[var(--text-muted)] text-sm font-medium px-4 py-2 rounded-full transition-all hover:text-white hover:bg-white/5 no-underline">
                        Gallery
                    </Link>
                </li>
                <li>
                    <Link href="#pricing" className="text-[var(--text-muted)] text-sm font-medium px-4 py-2 rounded-full transition-all hover:text-white hover:bg-white/5 no-underline">
                        Plans
                    </Link>
                </li>
                <li>
                    <Link href="/blog" className="text-[var(--text-muted)] text-sm font-medium px-4 py-2 rounded-full transition-all hover:text-white hover:bg-white/5 no-underline">
                        Blog
                    </Link>
                </li>
            </ul>
            <Link
                href="/editor"
                className="nav-cta"
                onClick={() => sendGAEvent('event', 'go_to_editor', { source: 'header' })}
            >
                Start creating
            </Link>
        </nav>
    )
}
