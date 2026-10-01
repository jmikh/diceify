'use client'

import Link from 'next/link'
import { ChevronLeft, Info, Lock } from 'lucide-react'
import Logo from '@/components/Logo'
import { useUser } from '@/features/account/useUser'
import { useDocumentStore } from '@/features/editor/store/useDocumentStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { useProjectStore } from '@/features/editor/store/useProjectStore'
import AccountControl from '../shell/AccountControl'
import CurrentProjectCard from './CurrentProjectCard'
import PhotoDropzone from './PhotoDropzone'
import ProjectGrid from './ProjectGrid'

/**
 * Where projects begin: a photo always starts a new project (it stays with that project for good). Shown when no
 * image is loaded, and over a loaded project after "New project" (`startOpen`).
 */
export default function StartScreen() {
  const { user } = useUser()
  const hasImage = useProjectStore((state) => state.imageSrc !== null)
  const projectId = useProjectStore((state) => state.projectId)
  const name = useDocumentStore((state) => state.name)
  const closeStart = useEditorUiStore((state) => state.closeStart)
  const openModal = useEditorUiStore((state) => state.openModal)

  const hasDraft = hasImage && projectId === null

  return (
    <div className="relative z-10 flex flex-col h-full">
      <header className="flex-shrink-0 h-16 flex items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity -ml-3">
            <Logo />
          </Link>
          {projectId && (
            <button
              onClick={closeStart}
              className="flex items-center gap-1 h-9 pl-2 pr-3 rounded-full text-sm text-white/75 hover:text-white hover:bg-white/[0.06] min-w-0"
            >
              <ChevronLeft size={16} className="flex-shrink-0" />
              <span className="truncate">Back to {name}</span>
            </button>
          )}
        </div>
        <AccountControl />
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="mx-auto w-full max-w-[960px] min-h-full px-5 lg:px-6 pt-6 pb-10 lg:py-10 flex flex-col lg:justify-center gap-7">
          <div className="flex flex-col gap-2.5">
            <h1 className="font-syne text-[30px] lg:text-[40px] font-bold tracking-tight text-white leading-tight">Start a new project</h1>
            <p className="text-[15px] lg:text-[17px] leading-relaxed text-white/70 max-w-[640px]">
              Every project is built from one photo. Close-up portraits with clear light make the best dice art.
            </p>
          </div>

          {hasDraft && <CurrentProjectCard />}

          <div className="flex flex-col gap-3">
            <PhotoDropzone />
            {hasDraft && !user && (
              <p className="flex items-start gap-2 text-[13px] leading-relaxed text-white/65">
                <Info size={15} className="mt-0.5 flex-shrink-0" />
                <span>
                  A new photo replaces {name} in this browser.{' '}
                  <button onClick={() => openModal('signIn')} className="text-accent-pink-light font-medium hover:underline">
                    Sign in
                  </button>{' '}
                  first to keep it.
                </span>
              </p>
            )}
            <p className="flex items-center gap-2 text-[13px] text-white/60">
              <Lock size={14} className="flex-shrink-0" />
              The photo stays with its project. To use a different photo, start another project.
            </p>
          </div>

          {user && <ProjectGrid />}
        </div>
      </main>
    </div>
  )
}
