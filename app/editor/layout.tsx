import { Metadata } from 'next'

import { auth } from '@/lib/auth'
import { SessionProvider } from 'next-auth/react'
import { AnalyticsTracker } from '@/components/Analytics/AnalyticsTracker'

export const metadata: Metadata = {
  title: 'Dice Art Builder — Upload, Crop, Tune & Build',
  description: 'Upload any photo, adjust contrast, and get step-by-step dice placement instructions. Free online dice art builder — no signup required.',
  keywords: [
    'dice art builder',
    'dice art editor',
    'dice art tool',
    'photo to dice converter',
    'dice portrait builder',
    'dice mosaic builder',
    'online dice art maker',
  ],
  openGraph: {
    title: 'Dice Art Builder — Upload, Crop, Tune & Build | Diceify',
    description: 'Upload any photo, adjust contrast, and get step-by-step dice placement instructions. Free online dice art builder — no signup required.',
    url: 'https://diceify.art/editor',
  },
  twitter: {
    title: 'Dice Art Builder — Upload, Crop, Tune & Build | Diceify',
    description: 'Upload any photo, adjust contrast, and get step-by-step dice placement instructions. Free online dice art builder — no signup required.',
  },
  alternates: {
    canonical: 'https://diceify.art/editor',
  },
}

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Diceify Builder",
    "url": "https://diceify.art/editor",
    "description": "Free online dice art builder. Upload a photo, tune contrast, and follow step-by-step placement instructions to build a real dice mosaic.",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "publisher": {
      "@type": "Organization",
      "name": "Diceify",
      "url": "https://diceify.art",
    },
  }

  return (
    <SessionProvider session={session}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      {children}
      <AnalyticsTracker user={session?.user} />
    </SessionProvider>
  )
}