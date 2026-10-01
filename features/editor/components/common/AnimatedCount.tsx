'use client'

import { useEffect, useRef } from 'react'
import CountUp from 'react-countup'

// Ease-out cubic for a smooth settle
const easeOutCubic = (t: number, b: number, c: number, d: number) => c * ((t = t / d - 1) * t * t + 1) + b

/** A number that counts from its previous value to the new one (dice totals). */
export default function AnimatedCount({ value, duration = 1 }: { value: number; duration?: number }) {
  const previous = useRef(value)
  useEffect(() => {
    previous.current = value
  }, [value])
  return (
    <CountUp start={previous.current} end={value} duration={duration} separator="," useEasing easingFn={easeOutCubic} preserveValue />
  )
}
