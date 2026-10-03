'use client'

import Link from 'next/link'
import { track } from '@/lib/analytics'

// Rendered on every marketing page (app/(marketing)/layout.tsx), so the homepage anchors are absolute (`/#pricing`).
// At most five links: the nav is a single pill and gets cluttered beyond that.
const LINKS = [
    { href: '/dice-art', label: 'Guide' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/blog', label: 'Blog' },
    { href: '/#pricing', label: 'Plans' },
    { href: '/about', label: 'About' },
]

const linkClass =
    'text-[var(--text-muted)] text-sm font-medium px-4 py-2 rounded-full transition-all hover:text-white hover:bg-white/5 no-underline'

export default function Navbar() {
    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 p-3 px-4 flex justify-between items-center gap-12 z-[100] bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-full whitespace-nowrap">
            <Link href="/" className="font-syne font-bold text-xl tracking-tight pl-3 no-underline text-[var(--text-primary)]">
                Dice<span className="text-[var(--pink)]">ify</span>
            </Link>
            <ul className="hidden md:flex gap-2 list-none">
                {LINKS.map(({ href, label }) => (
                    <li key={href}>
                        <Link href={href} className={linkClass}>
                            {label}
                        </Link>
                    </li>
                ))}
            </ul>
            {/* The editor is a heavy client bundle: never prefetch it from a marketing page. */}
            <Link
                href="/editor"
                prefetch={false}
                className="nav-cta"
                onClick={() => track('go_to_editor', { source: 'header' })}
            >
                Start creating
            </Link>
        </nav>
    )
}
