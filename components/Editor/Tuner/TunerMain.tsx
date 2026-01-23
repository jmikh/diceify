'use client'

import { RefObject } from 'react'
import DiceCanvas, { DiceCanvasRef } from './DiceCanvas'

interface TunerMainProps {
    diceCanvasRef: RefObject<DiceCanvasRef>
}

export default function TunerMain({ diceCanvasRef }: TunerMainProps) {
    return (
        <>
            <div>
                <DiceCanvas
                    ref={diceCanvasRef}
                    maxWidth={1080}
                    maxHeight={1080}
                />
            </div>
        </>
    )
}
