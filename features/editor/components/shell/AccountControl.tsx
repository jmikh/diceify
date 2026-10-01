'use client'

import { useUser } from '@/features/account/useUser'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import UserMenu from '../account/UserMenu'

/** Signed in: the avatar menu. Signed out: a sign-in button (`compact` for the mobile top bar). */
export default function AccountControl({ compact = false }: { compact?: boolean }) {
  const { user } = useUser()
  const openModal = useEditorUiStore((state) => state.openModal)

  if (user) return <UserMenu />
  return (
    <button
      onClick={() => openModal('signIn')}
      className={`${compact ? 'h-9 px-3 text-[13px]' : 'h-10 px-4 text-sm'} flex-shrink-0 rounded-full border border-accent-pink/45 bg-accent-pink/10 text-accent-pink-light font-semibold hover:bg-accent-pink/20 transition-colors`}
    >
      Sign in
    </button>
  )
}
