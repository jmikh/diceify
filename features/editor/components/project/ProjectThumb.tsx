import { Dices } from 'lucide-react'

interface ProjectThumbProps {
  /** Image URL, or null for the placeholder (a project whose thumbnail is not written yet). */
  src: string | null
  /** Edge length in px. */
  size: number
  className?: string
}

/** Square project thumbnail. */
export default function ProjectThumb({ src, size, className = '' }: ProjectThumbProps) {
  const box = { width: size, height: size }
  if (!src) {
    return (
      <span
        aria-hidden
        style={box}
        className={`flex flex-shrink-0 items-center justify-center rounded-[22%] border border-white/10 bg-white/[0.05] text-white/40 ${className}`}
      >
        <Dices size={Math.round(size * 0.45)} />
      </span>
    )
  }
  return <img src={src} alt="" style={box} className={`block flex-shrink-0 rounded-[22%] object-cover ${className}`} />
}
