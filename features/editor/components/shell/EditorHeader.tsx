'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'
import ProjectSwitcher from '../project/ProjectSwitcher'
import ShareButton from '../share/ShareButton'
import AccountControl from './AccountControl'
import StepTabs from './StepTabs'

/** Desktop header: logo · project switcher | step tabs | share · account. */
export default function EditorHeader() {
  return (
    <header className="relative z-30 h-16 flex-shrink-0 flex items-center gap-4 pl-6 pr-5">
      <div className="flex-1 basis-0 min-w-0 flex items-center gap-4">
        <Link href="/" className="flex-shrink-0 -ml-3 hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <span aria-hidden className="w-px h-[22px] bg-white/[0.12] flex-shrink-0" />
        <ProjectSwitcher />
      </div>
      <StepTabs />
      <div className="flex-1 basis-0 flex items-center justify-end gap-2">
        <ShareButton />
        <AccountControl />
      </div>
    </header>
  )
}
