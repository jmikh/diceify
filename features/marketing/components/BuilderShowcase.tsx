'use client'

import Link from 'next/link'
import { BookmarkCheck, ChevronsRight, Layers } from 'lucide-react'
import { PLAN_LIMITS } from '@/core/billing'
import { track } from '@/lib/analytics'
import BuilderDemo from './BuilderDemo'

const FREE_ROWS = PLAN_LIMITS.explorer.builderRowLimit

const POINTS = [
    { icon: Layers, label: 'Identical dice grouped, like ×6' },
    { icon: ChevronsRight, label: 'One tap to the next die' },
    { icon: BookmarkCheck, label: 'Progress saves, screen stays awake' },
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
                <p className="builder-showcase-lead">No more counting dice from a printout. We guide you row by row.</p>
                <ul className="builder-showcase-points">
                    {POINTS.map(({ icon: Icon, label }) => (
                        <li key={label}>
                            <span className="builder-showcase-icon" aria-hidden>
                                <Icon size={20} strokeWidth={1.8} />
                            </span>
                            {label}
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
