'use client'

import { useState } from 'react'
import { Check, Link2, Loader2, Share2, X } from 'lucide-react'
import { FaFacebook, FaXTwitter } from 'react-icons/fa6'
import { toast } from 'sonner'
import { sendGAEvent } from '@next/third-parties/google'
import { postIntentUrl, sharePath, shareCopy, shareUrl, type PostPlatform, type ShareSource } from '@/core/share'
import { useShareLink } from '@/features/editor/hooks/useShareLink'
import { useDerivedStore } from '@/features/editor/store/useDerivedStore'
import { useEditorUiStore } from '@/features/editor/store/useEditorUiStore'
import { ghostButton, primaryButton } from '../common/ui'

/** GA4's recommended `share` event, one per button (the link itself carries the matching utm_source). */
function trackShare(method: ShareSource, id: string): void {
    sendGAEvent('event', 'share', { method, content_type: 'dice_art', item_id: id })
}

/**
 * The share modal (`modal === 'share'`, opened by ShareButton for a signed-in user): creates the share for the current
 * art, previews its card and opens X / Facebook / the native share sheet, or copies the link.
 */
export default function ShareModal() {
    const open = useEditorUiStore(state => state.modal === 'share')
    const closeModal = useEditorUiStore(state => state.closeModal)
    const grid = useDerivedStore(state => state.grid)
    const { state, retry } = useShareLink(open)
    const [copied, setCopied] = useState(false)

    if (!open || !grid) return null

    const copy = shareCopy({ cols: grid.width, rows: grid.height })
    const share = state.status === 'ready' ? state.share : null
    const origin = window.location.origin
    const canUseShareSheet = typeof navigator.share === 'function'

    const post = (platform: PostPlatform) => {
        if (!share) return
        window.open(postIntentUrl(platform, shareUrl(origin, share.id, platform), copy.postText), '_blank', 'noopener,noreferrer')
        trackShare(platform, share.id)
    }

    const copyLink = async () => {
        if (!share) return
        try {
            await navigator.clipboard.writeText(shareUrl(origin, share.id, 'copy_link'))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            trackShare('copy_link', share.id)
        } catch {
            toast.error('Could not copy the link. Select it and copy it instead.')
        }
    }

    const openShareSheet = async () => {
        if (!share) return
        try {
            await navigator.share({ title: copy.title, text: copy.postText, url: shareUrl(origin, share.id, 'share_sheet') })
            trackShare('share_sheet', share.id)
        } catch {
            // Dismissed (AbortError) or refused: nothing to do
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />

            <div className="glass relative w-full max-w-lg p-6 md:p-7 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={closeModal}
                    aria-label="Close"
                    className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 z-10"
                >
                    <X size={20} className="text-white/60 hover:text-white transition-colors" />
                </button>

                <h2 className="text-xl font-bold text-white mb-1 pr-10">Share your dice art</h2>
                <p className="text-sm text-[var(--text-muted)] mb-5">
                    Anyone with the link sees this image. Your photo stays private.
                </p>

                <div className="relative aspect-[1200/630] w-full rounded-xl overflow-hidden border border-white/10 bg-black/40 mb-5">
                    {share ? (
                        <img src={share.cardUrl} alt={copy.imageAlt} className="w-full h-full object-cover" />
                    ) : state.status === 'error' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                            <p className="text-sm text-white/80">Couldn&apos;t create the share link.</p>
                            <button onClick={retry} className={`${ghostButton} h-9 px-4 text-sm`}>
                                Try again
                            </button>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white/70">
                            <Loader2 size={22} className="animate-spin" />
                            Creating your link…
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => post('x')} disabled={!share} className={`${ghostButton} h-11 text-sm`}>
                        <FaXTwitter size={16} />
                        Post on X
                    </button>
                    <button onClick={() => post('facebook')} disabled={!share} className={`${ghostButton} h-11 text-sm`}>
                        <FaFacebook size={16} className="text-[#1877F2]" />
                        Share on Facebook
                    </button>
                </div>

                <div className="mt-3 flex gap-2">
                    <input
                        readOnly
                        aria-label="Share link"
                        value={share ? `${origin}${sharePath(share.id)}` : ''}
                        placeholder="Creating link…"
                        onFocus={(event) => event.currentTarget.select()}
                        className="flex-1 min-w-0 h-11 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white/80 placeholder:text-white/35 outline-none focus:border-accent-pink/50"
                    />
                    <button onClick={copyLink} disabled={!share} className={`${primaryButton} h-11 px-5 text-sm`}>
                        {copied ? <Check size={16} /> : <Link2 size={16} />}
                        {copied ? 'Copied' : 'Copy link'}
                    </button>
                </div>

                {canUseShareSheet && (
                    <button onClick={openShareSheet} disabled={!share} className={`${ghostButton} mt-3 h-11 text-sm`}>
                        <Share2 size={16} />
                        More options
                    </button>
                )}
            </div>
        </div>
    )
}
