'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { X } from 'lucide-react'
import { ImReddit } from 'react-icons/im'
import Logo from '@/components/Logo'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import UserMenu from '../account/UserMenu'
import ProjectSelector from '../project/ProjectSelector'
import type { ProjectListMenuProps } from '../project/ProjectListMenu'
import HistoryButtons from './HistoryButtons'

type EditorHeaderProps = Omit<ProjectListMenuProps, 'onClose'>

const REDDIT_BANNER_KEY = 'redditBannerDismissed'

/**
 * Desktop header: logo, centred project selector, undo/redo and the account control, plus the dismissible
 * r/DicePortraits banner. On mobile its functions fold into the bottom bar menu.
 */
export default function EditorHeader(projectProps: EditorHeaderProps) {
  const { data: session, status } = useSession()
  const openModal = useEditorUiStore(state => state.openModal)

  const [redditBannerDismissed, setRedditBannerDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REDDIT_BANNER_KEY) === 'true'
    }
    return false
  })

  const dismissRedditBanner = () => {
    setRedditBannerDismissed(true)
    localStorage.setItem(REDDIT_BANNER_KEY, 'true')
  }

  return (
    <header className="relative flex-shrink-0" style={{ zIndex: 50 }}>
      <div className="max-w-7xl mx-auto px-4 py-4 relative">
        {/* Single row: logo, project name, auth */}
        <div className="flex items-center">
          {/* Logo - always on left */}
          <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <Logo />
          </Link>

          {/* Project name - absolutely centered */}
          <div className="absolute left-1/2 top-4 transform -translate-x-1/2 py-2">
            {session?.user && <ProjectSelector {...projectProps} />}
          </div>

          {/* Undo/redo + auth - always on right */}
          <div className="ml-auto flex-shrink-0 flex items-center gap-4">
            <HistoryButtons />
            {status === 'authenticated' && session ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => openModal('signIn')}
                className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white bg-accent-pink hover:bg-accent-pink-light rounded-lg transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reddit announcement banner. mt-4/-mb-1 keep it and the stepper where they were when the banner
          lived inside <main>'s padding (header py-4 → main p-4 → banner mb-3). */}
      {!redditBannerDismissed && (
        <div className="flex items-center justify-center gap-3 mx-auto mt-4 -mb-1 px-4 py-2.5 rounded-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] max-w-fit">
          <ImReddit className="text-accent-pink text-lg flex-shrink-0" />
          <span className="text-white/70 text-sm">
            <span className="font-medium text-white/90">New!</span>{' '}
            Join{' '}
            <a
              href="https://www.reddit.com/r/DicePortraits"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-pink hover:underline font-medium"
            >
              r/DicePortraits
            </a>
            {' '}— share your builds & see what others are creating
          </span>
          <button
            onClick={dismissRedditBanner}
            className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 p-0.5"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </header>
  )
}
