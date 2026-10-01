import { describe, expect, it } from 'vitest'
import { wheelZoomFactor } from './useWheelZoom'

const wheel = (deltaY: number, { deltaMode = 0, ctrlKey = false } = {}) => wheelZoomFactor({ deltaY, deltaMode, ctrlKey })

describe('wheelZoomFactor', () => {
    it('zooms in on negative deltas and out on positive ones, symmetrically', () => {
        expect(wheel(-40)).toBeGreaterThan(1)
        expect(wheel(40)).toBeLessThan(1)
        expect(wheel(-40) * wheel(40)).toBeCloseTo(1)
        expect(wheel(0)).toBe(1)
    })

    it('is proportional to the delta, so small trackpad deltas zoom a little', () => {
        expect(wheel(2)).toBeGreaterThan(0.99)
        expect(wheel(4)).toBeCloseTo(wheel(2) ** 2)
    })

    it('amplifies pinches (ctrl + wheel) and normalizes line / page deltas to pixels', () => {
        expect(wheel(5, { ctrlKey: true })).toBeLessThan(wheel(5))
        expect(wheel(3, { deltaMode: 1 })).toBeCloseTo(wheel(48))
        expect(wheel(1, { deltaMode: 2 })).toBeCloseTo(wheel(800))
    })
})
