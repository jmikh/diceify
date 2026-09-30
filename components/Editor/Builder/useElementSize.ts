import { useEffect, useState, type RefObject } from 'react'

export interface ElementSize {
    width: number
    height: number
}

/** Tracks an element's box via ResizeObserver; `null` until it has a non-zero size. */
export function useElementSize(ref: RefObject<HTMLElement>): ElementSize | null {
    const [size, setSize] = useState<ElementSize | null>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const measure = () => {
            const rect = el.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                setSize(prev =>
                    prev?.width === rect.width && prev?.height === rect.height
                        ? prev
                        : { width: rect.width, height: rect.height }
                )
            }
        }

        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [ref])

    return size
}
