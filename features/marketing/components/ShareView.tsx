'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { sendGAEvent } from '@next/third-parties/google'
import { isShareId, shareImageUrl } from '@/core/share'
import Logo from '@/components/Logo'
import { publicEnv } from '@/lib/env.public'

/** `/s/<id>` (served by the Pages Function) or `/share?id=<id>` (next dev, where there is no function). */
function shareIdFromLocation(): string | null {
  const fromPath = window.location.pathname.match(/^\/s\/([^/]+)\/?$/)?.[1]
  const candidate = fromPath ?? new URLSearchParams(window.location.search).get('id')
  return candidate && isShareId(candidate) ? candidate : null
}

type Status = 'loading' | 'ready' | 'missing'

/** A shared dice art: the card image and the way into the editor. Unknown ids (no image) show a not-found note. */
export default function ShareView() {
  const [id, setId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const shareId = shareIdFromLocation()
    setId(shareId)
    if (!shareId) setStatus('missing')
    else sendGAEvent('event', 'share_view', { share_id: shareId })
  }, [])

  const onCta = () => sendGAEvent('event', 'share_cta_click', { share_id: id ?? 'none' })

  return (
    <div className="relative z-[2] max-w-[880px] mx-auto w-full px-6 py-8 md:py-12">
      <header className="flex items-center justify-between mb-8 md:mb-10">
        <Link href="/" className="-ml-3 hover:opacity-80 transition-opacity" aria-label="Diceify home">
          <Logo />
        </Link>
        <Link href="/editor" onClick={onCta} className="btn-secondary text-sm">
          Make your own
        </Link>
      </header>

      {status !== 'missing' && id && (
        <div className="relative aspect-[1200/630] w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
          {status === 'loading' && <div className="absolute inset-0 animate-pulse bg-white/[0.03]" />}
          <img
            src={shareImageUrl(publicEnv.supabaseUrl, id)}
            alt="Dice art made with Diceify"
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('missing')}
            className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      )}

      <div className="text-center mt-10">
        {status === 'missing' ? (
          <>
            <h1 className="font-syne text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
              This share link doesn&apos;t exist
            </h1>
            <p className="text-[var(--text-muted)] mt-4 text-lg">Check the link, or make some dice art of your own.</p>
          </>
        ) : (
          <>
            <h1 className="font-syne text-3xl md:text-5xl font-bold text-[var(--text-primary)] leading-tight">
              Made with Diceify
            </h1>
            <p className="text-[var(--text-muted)] mt-4 text-lg leading-relaxed max-w-[560px] mx-auto">
              Every square is a real die. Diceify turns any photo into a dice mosaic you can build by hand, free.
            </p>
          </>
        )}
        <div className="flex flex-col items-center gap-4 mt-8">
          <Link href="/editor" onClick={onCta} className="btn-primary">
            Turn your photo into dice art
          </Link>
          <Link
            href="/gallery"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors no-underline"
          >
            See more in the gallery →
          </Link>
        </div>
      </div>
    </div>
  )
}
