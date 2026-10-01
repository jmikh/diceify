import type { ReactNode } from 'react'

/** Title row of the project popovers. */
export function PopoverHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-white/[0.08]">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">{title}</span>
      {right}
    </div>
  )
}
