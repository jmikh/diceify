import type { Metadata } from 'next'
import ShareView from '@/features/marketing/components/ShareView'

// The static shell behind /s/<id>: the Worker (worker/share.ts) serves this page with the share's own
// title, description, canonical and social card tags in place of these. Not indexed (user content); not in the sitemap.
export const metadata: Metadata = {
  title: 'Shared dice art',
  description: 'Dice art made with Diceify. Turn any photo into a dice mosaic you can build by hand.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/share' },
}

export default function SharePage() {
  return <ShareView />
}
