// Display formatting for project lists.

/** `17.58` → `"17.6%"`, whole numbers without a decimal. */
export function formatPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

/** Build progress for a list row: "Not built yet" or "17.6% built". */
export function formatBuilt(percent: number): string {
  return percent > 0 ? `${formatPercent(percent)} built` : 'Not built yet'
}

/** "Today", or a short date ("Sep 28"). */
export function formatEdited(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (date.toDateString() === now.toDateString()) return 'Today'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
