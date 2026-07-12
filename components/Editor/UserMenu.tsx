'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { devError } from '@/lib/utils/debug'

// Avatar + account dropdown for the editor header (assumes an authenticated session)
export default function UserMenu() {
    const { data: session } = useSession()
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

    if (!session?.user) return null

    const planType = session.user.planType || 'explorer'
    const subStatus = session.user.subscriptionStatus
    const expiresAt = session.user.subscriptionExpiresAt

    // Calculate expiration text
    let expirationText = ''
    if (expiresAt) {
        const expiresDate = new Date(expiresAt)
        const isExpired = expiresDate.getTime() < Date.now()
        const formattedDate = expiresDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

        if (planType === 'creator') {
            // Creator shows expiration date only
            expirationText = isExpired ? 'Expired' : `Expires on ${formattedDate}`
        } else if (planType === 'studio' && subStatus === 'canceled') {
            // Canceled Studio shows expiration date
            expirationText = isExpired ? 'Expired' : `Expires on ${formattedDate}`
        }
    }

    const handleManageSubscription = async () => {
        try {
            const response = await fetch('/api/stripe/portal', { method: 'POST' })
            const data = await response.json()
            if (data.url) {
                window.location.href = data.url
            }
        } catch (error) {
            console.error('Failed to open billing portal:', error)
        }
    }

    const getPlanBadge = () => {
        switch (planType) {
            case 'lifetime':
                return <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">LIFETIME</span>
            case 'studio':
                return <span className="px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-bold border border-pink-500/30">STUDIO</span>
            case 'creator':
                return <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">CREATOR PASS</span>
            default:
                return <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-bold border border-white/20">EXPLORER</span>
        }
    }

    return (
        <div className="flex items-center gap-3">
            <div className="relative user-menu-container">
                <div
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => setShowMenu(!showMenu)}
                >
                    {session.user.image ? (
                        <img
                            src={session.user.image}
                            alt={session.user.name || 'User'}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                devError('Image failed to load:', session.user?.image)
                                // Hide the broken image and show fallback
                                e.currentTarget.style.display = 'none'
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                if (fallback) fallback.style.display = 'flex'
                            }}
                        />
                    ) : null}
                    <div
                        className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 items-center justify-center text-white font-semibold"
                        style={{ display: session.user.image ? 'none' : 'flex' }}
                    >
                        {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                </div>

                {/* Dropdown menu */}
                {showMenu && (
                    <div className="absolute top-full right-0 mt-2 bg-[#0a0014]/90 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 overflow-hidden z-50" style={{ minWidth: '280px' }}>
                        <div className="px-4 py-3 border-b border-gray-700">
                            <div className="text-sm font-medium text-white">
                                {session.user.name || 'User'}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                                {session.user.email}
                                {getPlanBadge()}
                            </div>
                            {expirationText && (
                                <div className={`text-xs mt-1.5 ${subStatus === 'canceled' ? 'text-orange-400' : 'text-gray-500'}`}>
                                    {subStatus === 'canceled' && <span className="text-orange-400">Canceled • </span>}
                                    {expirationText}
                                </div>
                            )}
                        </div>

                        {/* Manage subscription for Studio users */}
                        {planType === 'studio' && subStatus !== 'canceled' && (
                            <button
                                onClick={handleManageSubscription}
                                className="w-full px-4 py-2 text-sm text-left text-white/90 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5"
                            >
                                Manage subscription
                            </button>
                        )}

                        {/* Sign Out */}
                        <button
                            onClick={() => {
                                setShowMenu(false)
                                signOut()
                            }}
                            className="w-full px-4 py-2 text-sm text-left text-white/90 hover:text-white hover:bg-white/10 transition-colors hover:rounded-b-lg"
                        >
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
