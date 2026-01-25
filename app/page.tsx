import { Suspense } from 'react'
import Script from 'next/script'
import Navbar from '@/components/LandingPage/Navbar'
import Hero from '@/components/LandingPage/Hero'
import HowItWorks from '@/components/LandingPage/HowItWorks'
import Gallery from '@/components/LandingPage/Gallery'
import Pricing from '@/components/LandingPage/Pricing'
import Footer from '@/components/Footer'
import { HashScrollHandler } from '@/components/HashScrollHandler'

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Diceify",
    "description": "Transform photos into dice mosaic art. Create stunning physical dice mosaics from your digital photos with our free online tool.",
    "url": "https://diceify.art",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "42"
    },
    "creator": {
      "@type": "Organization",
      "name": "Diceify",
      "url": "https://diceify.art"
    }
  }

  return (
    <>
      <HashScrollHandler />
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
          <HowItWorks />
          <Gallery />
          <Suspense fallback={<div className="py-24" />}>
            <Pricing />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  )
}