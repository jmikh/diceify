'use client'

import { useRef, useEffect } from 'react'
import CountUp from 'react-countup'
import { theme } from '@/lib/theme'
import { useEditorStore } from '@/lib/store/useEditorStore'

// Ease-out cubic function for smooth deceleration
const easeOutCubic = (t: number, b: number, c: number, d: number) => {
    return c * ((t = t / d - 1) * t * t + 1) + b
}

/**
 * Dice count summary card: animated total plus a black/white proportion bar.
 * Shared between the tune panel, the build panel and the mobile toolbar.
 * `compact` renders a two-line variant sized for the mobile toolbar.
 */
export default function DiceStatsCard({ compact = false }: { compact?: boolean }) {
    const diceStats = useEditorStore(state => state.diceStats)
    const { blackCount, whiteCount, totalCount } = diceStats

    // Track previous values for smooth transitions
    const prevCountRef = useRef(totalCount)
    const prevBlackRef = useRef(blackCount)
    const prevWhiteRef = useRef(whiteCount)

    useEffect(() => {
        prevCountRef.current = totalCount
        prevBlackRef.current = blackCount
        prevWhiteRef.current = whiteCount
    }, [totalCount, blackCount, whiteCount])

    if (compact) {
        return (
            <div className="w-full">
                {/* Counts row: black | total | white */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.colors.text.secondary }}>
                        <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: 'black', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                        <CountUp start={prevBlackRef.current} end={blackCount} duration={1} separator="," useEasing={true} easingFn={easeOutCubic} preserveValue={true} />
                    </div>
                    <div className="text-base font-bold" style={{ color: theme.colors.text.primary }}>
                        <CountUp start={prevCountRef.current} end={totalCount} duration={1.5} separator="," useEasing={true} easingFn={easeOutCubic} preserveValue={true} />
                        <span className="text-xs font-normal ml-1.5" style={{ color: theme.colors.text.muted }}>dice</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.colors.text.secondary }}>
                        <CountUp start={prevWhiteRef.current} end={whiteCount} duration={1} separator="," useEasing={true} easingFn={easeOutCubic} preserveValue={true} />
                        <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    </div>
                </div>

                {/* Proportional bar */}
                <div className="h-3 rounded-lg overflow-hidden flex border" style={{
                    backgroundColor: theme.colors.glass.light,
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                }}>
                    {totalCount > 0 && (
                        <>
                            <div className="bg-black transition-all" style={{ width: `${(blackCount / totalCount) * 100}%` }} />
                            <div className="bg-white transition-all" style={{ width: `${(whiteCount / totalCount) * 100}%` }} />
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            {/* Total dice count */}
            <div className="text-center mb-3">
                <div className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
                    <CountUp
                        start={prevCountRef.current}
                        end={totalCount}
                        duration={1.5}
                        separator=","
                        useEasing={true}
                        easingFn={easeOutCubic}
                        preserveValue={true}
                    />
                </div>
                <div className="text-xs" style={{ color: theme.colors.text.muted }}>total dice</div>
            </div>

            {/* Proportional bar */}
            <div className="h-4 rounded-lg overflow-hidden flex mb-2 border" style={{
                backgroundColor: theme.colors.glass.light,
                borderColor: 'rgba(255, 255, 255, 0.2)'
            }}>
                {totalCount > 0 && (
                    <>
                        <div
                            className="bg-black transition-all"
                            style={{
                                width: `${(blackCount / totalCount) * 100}%`
                            }}
                        />
                        <div
                            className="bg-white transition-all"
                            style={{
                                width: `${(whiteCount / totalCount) * 100}%`
                            }}
                        />
                    </>
                )}
            </div>

            <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: 'black', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    <span style={{ color: theme.colors.text.secondary }}>
                        <CountUp
                            start={prevBlackRef.current}
                            end={blackCount}
                            duration={1}
                            separator=","
                            useEasing={true}
                            easingFn={easeOutCubic}
                            preserveValue={true}
                        />
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: 'white', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                    <span style={{ color: theme.colors.text.secondary }}>
                        <CountUp
                            start={prevWhiteRef.current}
                            end={whiteCount}
                            duration={1}
                            separator=","
                            useEasing={true}
                            easingFn={easeOutCubic}
                            preserveValue={true}
                        />
                    </span>
                </div>
            </div>
        </div>
    )
}
