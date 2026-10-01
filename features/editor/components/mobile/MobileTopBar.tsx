'use client'

import ProjectSwitcher from '../project/ProjectSwitcher'
import AccountControl from '../shell/AccountControl'
import ShareButton from '../share/ShareButton'

/** Mobile header: project switcher · share · account. */
export default function MobileTopBar() {
    return (
        <header className="relative z-30 flex-shrink-0 flex items-center gap-2 px-4 pb-1" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}>
            <ProjectSwitcher compact />
            <span className="flex-1" />
            <ShareButton compact />
            <AccountControl compact />
        </header>
    )
}
