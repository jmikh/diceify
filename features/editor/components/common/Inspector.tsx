import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { sectionLabel } from './ui'

interface InspectorProps {
  title: string
  description: string
  children: ReactNode
  /** Step navigation, pinned to the bottom. */
  footer: ReactNode
}

/** The right-hand settings panel of the desktop editor: title, scrollable sections, pinned footer. */
export function Inspector({ title, description, children, footer }: InspectorProps) {
  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pt-6 pb-2 flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-syne text-[22px] font-bold text-white">{title}</h2>
          <p className="text-sm leading-relaxed text-white/65">{description}</p>
        </div>
        {children}
      </div>
      <div className="flex-shrink-0 mx-6 mb-6 pt-5 border-t border-white/[0.08] flex gap-2.5">{footer}</div>
    </>
  )
}

/** A labelled group of controls inside the inspector. */
export function InspectorSection({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className={sectionLabel}>{label}</h3>
        {hint && <span className="text-xs text-white/55">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

/** A full-width action row inside an inspector section (build tools, blueprint download). */
export function InspectorToolButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 h-11 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-medium text-white/90 hover:bg-white/[0.07] transition-colors text-left"
    >
      <Icon size={17} className="text-white/65" />
      <span className="flex-1">{label}</span>
    </button>
  )
}
