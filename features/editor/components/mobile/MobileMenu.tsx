'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Sparkles, LogOut, Home, Cloud, Undo2, Redo2, CreditCard } from 'lucide-react'
import { useUser } from '@/features/account/useUser'
import { useUndoRedo } from '@/features/editor/hooks/useUndoRedo'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import { formatSaveStatus } from '@/features/editor/components/project/saveStatus'
import PlanBadge from '@/features/billing/PlanBadge'
import ProjectListMenu, { ProjectListMenuProps } from '@/features/editor/components/project/ProjectListMenu'

type MobileMenuProps = Omit<ProjectListMenuProps, 'onClose'>

/**
 * Account menu for the mobile bottom bar; the dropdown opens upward. One
 * button that adapts to auth state: signed out it offers sign-in; signed in
 * it holds the project switcher, save status, upgrade/billing and sign-out.
 */
export default function MobileMenu(projectProps: MobileMenuProps) {
    const { user, entitlements: ent, signOut } = useUser()
    const openModal = useEditorUiStore(state => state.openModal)
    const saveStatus = useProjectStore(state => state.saveStatus)
    const lastSaved = useProjectStore(state => state.lastSaved)
    const { canUndo, canRedo, undo, redo } = useUndoRedo()

    const [open, setOpen] = useState(false)

    const menuItemClass = 'w-full px-4 py-3 text-sm text-left text-white/80 active:bg-white/10 transition-colors flex items-center gap-3'

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(prev => !prev)}
                className={`w-11 h-11 rounded-full flex items-center justify-center border bg-white/5 text-white/80 transition-colors ${open ? 'border-accent-pink/60' : 'border-white/15'}`}
                aria-label="Account menu"
            >
                <Menu size={20} />
            </button>

            {open && (
                <>
                    {/* Backdrop to close on outside tap */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

                    <div
                        className="absolute bottom-full right-0 mb-2 w-[19rem] max-w-[calc(100vw-1.5rem)] bg-[#0a0014]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50 flex flex-col"
                        style={{ maxHeight: 'calc(100dvh - 8rem)' }}
                    >
                        {user ? (
                            <>
                                {/* Account header */}
                                <div className="px-4 py-3 border-b border-white/10">
                                    <div className="text-sm font-medium text-white">{user.name || 'User'}</div>
                                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 min-w-0">
                                        <span className="truncate">{user.email}</span>
                                        <PlanBadge plan={ent.plan} />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                                        <Cloud size={12} />
                                        {formatSaveStatus(saveStatus, lastSaved)}
                                    </div>
                                </div>

                                {/* Project switcher */}
                                <ProjectListMenu {...projectProps} onClose={() => setOpen(false)} />

                                {/* Plan actions */}
                                {!ent.isPro && (
                                    <Link href="/#pricing" className={`${menuItemClass} border-t border-white/10 text-accent-pink-light`} onClick={() => setOpen(false)}>
                                        <Sparkles size={16} />
                                        Upgrade
                                    </Link>
                                )}
                                <Link href="/account" className={`${menuItemClass} border-t border-white/5`} onClick={() => setOpen(false)}>
                                    <CreditCard size={16} />
                                    Account &amp; billing
                                </Link>

                                <button
                                    onClick={() => {
                                        setOpen(false)
                                        signOut()
                                    }}
                                    className={`${menuItemClass} border-t border-white/5`}
                                >
                                    <LogOut size={16} />
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <div className="p-4 space-y-3">
                                <p className="text-xs text-gray-400 text-center">
                                    Sign in to save your project and sync across devices
                                </p>
                                <button
                                    onClick={() => {
                                        setOpen(false)
                                        openModal('signIn')
                                    }}
                                    className="w-full py-3 rounded-full bg-accent-pink active:bg-accent-pink-light text-white text-sm font-semibold shadow-[0_0_15px_rgb(var(--pink-rgb)/0.3)] transition-all"
                                >
                                    Sign in
                                </button>
                            </div>
                        )}

                        {/* Undo / redo - the header buttons are desktop only */}
                        <div className="flex border-t border-white/10">
                            <button onClick={undo} disabled={!canUndo} className={`${menuItemClass} flex-1 justify-center disabled:opacity-30`}>
                                <Undo2 size={16} />
                                Undo
                            </button>
                            <button onClick={redo} disabled={!canRedo} className={`${menuItemClass} flex-1 justify-center border-l border-white/10 disabled:opacity-30`}>
                                <Redo2 size={16} />
                                Redo
                            </button>
                        </div>

                        {/* Home link - the logo is hidden on mobile */}
                        <Link
                            href="/"
                            className={`${menuItemClass} border-t border-white/10 text-white/60`}
                            onClick={() => setOpen(false)}
                        >
                            <Home size={16} />
                            Diceify home
                        </Link>
                    </div>
                </>
            )}
        </div>
    )
}
