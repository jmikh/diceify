import type { Metadata } from 'next'
import { Inter, Outfit, Syne } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'
import { auth } from '@/lib/auth'

import { Providers } from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://diceify.art'),
  title: {
    default: 'Diceify — Free Dice Art Generator for Portraits & Mosaics',
    template: '%s | Diceify'
  },
  description: 'Create dice art portraits and mosaics from any photo. Diceify is a free dice art generator with contrast tuning, a step-by-step builder, and patterns you can build by hand.',
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
    'diy art project'
  ],
  authors: [{ name: 'Diceify Team' }],
  creator: 'Diceify',
  publisher: 'Diceify',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Diceify — Free Dice Art Generator for Portraits & Mosaics',
    description: 'Create dice art portraits and mosaics from any photo. Free generator with contrast tuning and a step-by-step builder.',
    url: 'https://diceify.art',
    siteName: 'Diceify',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Diceify — Free Dice Art Generator for Portraits & Mosaics',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Diceify — Free Dice Art Generator for Portraits & Mosaics',
    description: 'Create dice art portraits and mosaics from any photo. Free generator with contrast tuning and a step-by-step builder.',
    images: ['/twitter-image'],
    creator: '@diceify',
  },
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
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://diceify.art',
    languages: {
      'en': 'https://diceify.art',
      'x-default': 'https://diceify.art',
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Diceify",
    "url": "https://diceify.art",
    "description": "Free dice art generator for portraits and mosaics. Turn any photo into buildable dice patterns.",
    "publisher": {
      "@type": "Organization",
      "name": "Diceify",
      "url": "https://diceify.art",
      "logo": {
        "@type": "ImageObject",
        "url": "https://diceify.art/favicon-192x192.png"
      }
    }
  }

  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable}`}>
      <body className={outfit.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Providers>
          {children}
        </Providers>
        <GoogleAnalytics gaId="G-BDR76Z4JEE" />
        <Analytics />
      </body>
    </html>
  )
}