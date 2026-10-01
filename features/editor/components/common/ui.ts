// Class strings shared by the editor's controls (one look for every button and panel).

/** Filled pink without a corner radius (add your own); `primaryButton` is the pill. */
export const primaryFill =
  'inline-flex items-center justify-center gap-2 bg-accent-pink-strong text-white font-semibold whitespace-nowrap ' +
  'shadow-[0_0_24px_rgb(var(--pink-rgb)/0.35)] hover:shadow-[0_0_32px_rgb(var(--pink-rgb)/0.55)] transition-shadow ' +
  'disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed'

export const primaryButton = `${primaryFill} rounded-full`

export const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] text-white/85 font-medium ' +
  'whitespace-nowrap hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

export const iconButton =
  'inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/85 ' +
  'hover:bg-white/10 hover:text-white transition-colors disabled:opacity-35 disabled:cursor-not-allowed'

/** Selected / unselected look of segmented options, chips and tool tabs. */
export const choiceOn = 'border border-accent-pink/60 bg-accent-pink/[0.14] text-white'
export const choiceOff = 'border border-white/[0.08] bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white'

export const panel = 'bg-[#0f0f12]/90 border border-white/[0.08] backdrop-blur-xl'

export const popover = 'bg-[#0e0618]/[0.97] border border-white/10 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.55)]'

export const sectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'
