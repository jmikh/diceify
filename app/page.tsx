import { Suspense } from 'react'
import Script from 'next/script'
import Navbar from '@/components/LandingPage/Navbar'
import Hero from '@/components/LandingPage/Hero'

import Gallery from '@/components/LandingPage/Gallery'
import BlogSection from '@/components/LandingPage/BlogSection'
import Pricing from '@/components/LandingPage/Pricing'
import Footer from '@/components/Footer'
import { HashScrollHandler } from '@/components/HashScrollHandler'

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Diceify",
    "description": "Free dice art generator to create portraits and mosaics from photos. Convert any picture into buildable dice patterns with step-by-step instructions.",
    "url": "https://diceify.art",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": "Diceify",
      "url": "https://diceify.art"
    }
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a dice art generator?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A dice art generator converts photos into patterns that can be recreated using physical dice. Each die face (1-6 dots) represents different shades, creating a mosaic-like portrait or picture."
        }
      },
      {
        "@type": "Question",
        "name": "How do I make dice portraits?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Upload your photo to Diceify, crop to your desired area, adjust contrast and size settings, then follow our step-by-step builder to place each die in the correct position."
        }
      },
      {
        "@type": "Question",
        "name": "How many dice do I need for dice art?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The number of dice depends on your design size. Diceify automatically calculates the exact dice count needed based on your chosen dimensions, typically ranging from a few hundred to several thousand dice."
        }
      }
    ]
  }

  return (
    <>
      <HashScrollHandler />
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        id="faq-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Background Elements */}
      <div className="bg-gradient">
        <div className="orb one"></div>
        <div className="orb two"></div>
        <div className="orb three"></div>
      </div>
      <div className="grid-overlay"></div>

      {/* Content */}
      <div className="content relative z-[2] max-w-[1400px] mx-auto w-full">
        <Navbar />
        <main>
          <Hero />

          <Gallery />
          <BlogSection />
          <Suspense fallback={<div className="py-24" />}>
            <Pricing />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  )
}