'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { devError } from '@/lib/utils/debug'
import { useUser } from '@/features/account/useUser'
import PlanBadge from '@/features/billing/PlanBadge'
import { formatBillingDate } from '@/features/billing/planCopy'

// Avatar + account dropdown for the editor header (rendered only when signed in)
export default function UserMenu() {
    const { user, entitlements: ent, signOut } = useUser()
    const [showMenu, setShowMenu] = useState(false)

    // Close when clicking outside
    useEffect(() => {
        if (!showMenu) return

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.user-menu-container')) {
                setShowMenu(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showMenu])

    if (!user) return null

    // A Creator pass and a cancelled Studio subscription both end on `accessUntil`; a renewing Studio shows nothing
    const canceled = ent.plan === 'studio' && ent.cancelAt !== null
    const expirationText = ent.accessUntil && (ent.plan === 'creator' || canceled)
        ? `Expires on ${formatBillingDate(ent.accessUntil)}`
        : ''

    return (
        <div className="flex items-center gap-3">
            <div className="relative user-menu-container">
                <div
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => setShowMenu(!showMenu)}
                >
                    {user.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.name || 'User'}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                devError('Image failed to load:', user.avatarUrl)
                                // Hide the broken image and show fallback
                                e.currentTarget.style.display = 'none'
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                if (fallback) fallback.style.display = 'flex'
                            }}
                        />
                    ) : null}
                    <div
                        className="w-full h-full bg-gradient-to-br from-accent-pink to-purple-600 items-center justify-center text-white font-semibold"
                        style={{ display: user.avatarUrl ? 'none' : 'flex' }}
                    >
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                </div>

                {/* Dropdown menu */}
                {showMenu && (
                    <div className="absolute top-full right-0 mt-2 bg-[#0a0014]/90 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 overflow-hidden z-50" style={{ minWidth: '280px' }}>
                        <div className="px-4 py-3 border-b border-gray-700">
                            <div className="text-sm font-medium text-white">
                                {user.name || 'User'}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                                {user.email}
                                <PlanBadge plan={ent.plan} />
                            </div>
                            {expirationText && (
                                <div className={`text-xs mt-1.5 ${canceled ? 'text-orange-400' : 'text-gray-500'}`}>
                                    {canceled && <span className="text-orange-400">Canceled • </span>}
                                    {expirationText}
                                </div>
                            )}
                        </div>

                        {/* Plan, cancel/resume, portal */}
                        <Link
                            href="/account"
                            onClick={() => setShowMenu(false)}
                            className="block w-full px-4 py-2 text-sm text-left text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            Account &amp; billing
                        </Link>

                        {/* Sign Out */}
                        <button
                            onClick={() => {
                                setShowMenu(false)
                                signOut()
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-white/90 hover:text-white hover:bg-white/10 transition-colors hover:rounded-b-lg border-t border-white/5"
                        >
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
