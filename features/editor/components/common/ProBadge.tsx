import type { ReactNode } from 'react'

/** A small pink tag on a control the user's plan does not include (the design paywall). Position it with `className`. */
export default function ProBadge({ children = 'PRO', className = '' }: { children?: ReactNode; className?: string }) {
    return (
        <span className={`inline-flex items-center px-1 py-[3px] rounded-[5px] bg-accent-pink-strong text-white text-[9px] font-bold leading-none tracking-[0.08em] whitespace-nowrap shadow-[0_0_10px_rgb(var(--pink-rgb)/0.45)] ${className}`}>
            {children}
        </span>
    )
}
