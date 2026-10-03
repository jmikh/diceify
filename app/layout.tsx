import type { Metadata, Viewport } from 'next'
import { Outfit, Syne } from 'next/font/google'
import Analytics from '@/components/Analytics'
import JsonLd from '@/components/JsonLd'
import { siteGraph } from '@/lib/schema'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL, socialMetadata } from '@/lib/seo'
import '@/styles/base.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })

// viewportFit: 'cover' lets the editor extend behind notches and use
// env(safe-area-inset-*) for the mobile toolbars
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | Diceify'
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'dice art',
    'dice portrait',
    'dice art generator',
    'dice mosaic',
    'dice portrait generator',
    'dice picture generator',
    'dice mosaic generator',
    'dice mosaic maker',
    'photo to dice',
    'dice pixel art',
    'diy art project',
    'dice art gift',
    'personalized gift ideas',
    'personalized photo gift',
    'custom portrait gift',
    'unique gift ideas',
    'diy gift ideas',
    'handmade gift ideas',
    'personalized birthday gift',
    'anniversary gift ideas',
    'christmas gift ideas',
    'gift for board game lovers'
  ],
  authors: [{ name: 'Diceify Team' }],
  creator: 'Diceify',
  publisher: 'Diceify',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // No canonical/og:url here: children would inherit the homepage's. Each indexable page sets its own (pageMetadata).
  ...socialMetadata(DEFAULT_TITLE, DEFAULT_DESCRIPTION),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
      },
      {
        url: '/favicon-16x16.png',
        type: 'image/png',
        sizes: '16x16',
      },
      {
        url: '/favicon-32x32.png',
        type: 'image/png',
        sizes: '32x32',
      },
      {
        url: '/favicon-48x48.png',
        type: 'image/png',
        sizes: '48x48',
      },
      {
        url: '/favicon-64x64.png',
        type: 'image/png',
        sizes: '64x64',
      },
      {
        url: '/favicon-96x96.png',
        type: 'image/png',
        sizes: '96x96',
      },
      {
        url: '/favicon-192x192.png',
        type: 'image/png',
        sizes: '192x192',
      },

    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable}`}>
      <head>
        {/* Rendered by hand: Next's `metadata.manifest` adds crossorigin="use-credentials", which this public file does not want. */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={outfit.className}>
        {/* Organization + founder on every page; the homepage adds WebSite and WebApplication (lib/schema.ts). */}
        <JsonLd data={siteGraph()} />
        {children}
        <Analytics />
      </body>
    </html>
  )
}