'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import EditorScreen from '@/features/editor/components/shell/EditorScreen'

// The workspace renders client-side (its static HTML is the loading screen), so this intro is the page's heading and
// the only text crawlers that don't run JavaScript get. It sits under the 100dvh loading screen in the static HTML
// (visible when scrolled, so no layout shift above the fold) and collapses to screen-reader-only once the app has
// mounted, because the editor shell is one fixed viewport that must not scroll.
// The bootstrap reads window.location.search directly (no useSearchParams), so no Suspense boundary is needed.
export default function EditorPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
      <EditorScreen />
      <section
        aria-labelledby="editor-intro-heading"
        className={mounted ? 'sr-only' : 'relative z-10 mx-auto max-w-2xl px-6 py-12 text-white/80 leading-relaxed'}
      >
        <h1 id="editor-intro-heading" className="mb-4 text-2xl font-semibold text-white">
          Diceify dice art editor
        </h1>
        <p className="mb-4">
          The Diceify editor turns a photo into a dice art pattern you can build with real six-sided dice. Upload a
          JPG, PNG or WebP and work through three steps: crop the photo, tune the grid size (20 to 120 rows),
          contrast, brightness and edge detail until the preview looks right, then build it row by row with a guide
          that tells you which die goes where and which face is up.
        </p>
        <p className="mb-4">
          The preview and the exact count of black and white dice you need are free, with no account required. Read{' '}
          <Link href="/dice-art" className="text-[var(--pink)] underline">
            how dice art works
          </Link>{' '}
          for the size chart and materials, or start from the{' '}
          <Link href="/" className="text-[var(--pink)] underline">
            dice art generator
          </Link>{' '}
          on the home page.
        </p>
        <noscript>
          <p>The editor needs JavaScript to run; enable it in your browser to upload a photo and start building.</p>
        </noscript>
      </section>
    </>
  )
}
