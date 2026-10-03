import { Metadata } from 'next'
import '@/styles/editor.css'
import JsonLd from '@/components/JsonLd'
import { APP_REF, pageGraph, WEBSITE_REF } from '@/lib/schema'
import { pageMetadata, SITE_URL } from '@/lib/seo'

import { ProfileProvider } from '@/features/account/useUser'
import { AnalyticsTracker } from '@/features/account/AnalyticsTracker'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Dice Art Builder — Upload, Crop, Tune & Build',
    description: 'Upload any photo, adjust contrast, and get step-by-step dice placement instructions. Free online dice art builder — no signup required.',
    path: '/editor',
  }),
  keywords: [
    'dice art builder',
    'dice art editor',
    'dice art tool',
    'photo to dice converter',
    'dice portrait builder',
    'dice mosaic builder',
    'online dice art maker',
    'personalized photo gift maker',
    'custom portrait gift',
    'diy photo gift',
  ],
}

// The editor page is where the one WebApplication entity (`#app`, declared on the homepage) lives; no second node.
const editorJsonLd = pageGraph({
  '@type': 'WebPage',
  url: `${SITE_URL}/editor`,
  name: 'Diceify dice art editor',
  mainEntity: APP_REF,
  isPartOf: WEBSITE_REF,
})

// Server layout (static): metadata + JSON-LD; the auth/profile state is client-side in ProfileProvider.
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <JsonLd data={editorJsonLd} />
      {children}
      <AnalyticsTracker />
    </ProfileProvider>
  )
}
