'use client'

import Link from 'next/link'
import { BookmarkCheck, ChevronsRight, Layers } from 'lucide-react'
import { PLAN_LIMITS } from '@/core/billing'
import { track } from '@/lib/analytics'
import BuilderDemo from './BuilderDemo'

const FREE_ROWS = PLAN_LIMITS.explorer.builderRowLimit

const POINTS = [
    {
        icon: Layers,
        title: 'Grab a whole run at once',
        text: 'Identical dice next to each other are grouped with a count, like ×6, so you place them in one go.',
    },
    {
        icon: ChevronsRight,
        title: 'One tap to the next die',
        text: 'Jump straight to the next different die. The row and column are always on screen.',
    },
    {
        icon: BookmarkCheck,
        title: 'Never lose your place',
        text: 'Your progress saves as you go, and the screen stays awake while you build.',
    },
]

/** Landing section for Builder Studio (the build step): the pitch next to a looping demo of the builder. */
export default function BuilderShowcase() {
    return (
        <section className="builder-showcase">
            <div>
                <span className="section-label">Builder Studio</span>
                <h2>
                    Finish your dice art <span className="highlight">3× faster</span>
                </h2>
                <p className="builder-showcase-lead">
                    Building from a printed pattern means counting every die and losing your place. Builder Studio walks
                    you through your design row by row, from the bottom left, and does the counting for you.
                </p>
                <ul className="builder-showcase-points">
                    {POINTS.map(({ icon: Icon, title, text }) => (
                        <li key={title}>
                            <span className="builder-showcase-icon" aria-hidden>
                                <Icon size={20} strokeWidth={1.8} />
                            </span>
                            <span>
                                <strong>{title}</strong>
                                {text}
                            </span>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <Link
                        href="/editor"
                        prefetch={false}
                        className="btn-primary"
                        onClick={() => track('go_to_editor', { source: 'builder_showcase' })}
                    >
                        Try Builder Studio
                    </Link>
                    <span className="text-sm text-[var(--text-dim)]">Free for the first {FREE_ROWS} rows</span>
                </div>
            </div>
            <BuilderDemo />
        </section>
    )
}
