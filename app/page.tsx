import { Suspense } from 'react'
import Script from 'next/script'
import Navbar from '@/components/LandingPage/Navbar'
import Hero from '@/components/LandingPage/Hero'

import Gallery from '@/components/LandingPage/Gallery'
import BlogSection from '@/components/LandingPage/BlogSection'
import Pricing from '@/components/LandingPage/Pricing'
import FAQ from '@/components/LandingPage/FAQ'
import Footer from '@/components/Footer'
import { HashScrollHandler } from '@/components/HashScrollHandler'

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Diceify",
    "description": "Diceify is a free dice art generator that turns photos into dice portraits and mosaics. Upload any image, tune contrast and detail, then follow step-by-step instructions to build your design by hand.",
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
        "name": "What is dice art?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Dice art is a form of mosaic art where standard six-sided dice are arranged in a grid to recreate an image. Each die face (1 dot through 6 dots) acts as a different shade of gray. When hundreds or thousands of dice are placed together, the individual faces blend into a cohesive image, much like pixels on a screen."
        }
      },
      {
        "@type": "Question",
        "name": "How many dice do I need?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It depends on the size and detail of your design. A small dice portrait might use 400 to 900 dice (20x20 to 30x30 grid), a medium project around 1,600 to 2,500 dice (40x40 to 50x50), and large-scale pieces can use 5,000 or more. Diceify automatically calculates the exact count based on your chosen dimensions."
        }
      },
      {
        "@type": "Question",
        "name": "Should I use black dice, white dice, or both?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "For the best results, use both black and white dice. This gives you 12 brightness levels instead of 6, producing much clearer images with smoother shading. Black dice alone still work, but the detail is noticeably reduced. White dice alone don't produce recognizable images."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need a high-quality photo?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Dice art generators downscale your image by aggregating groups of pixels into single brightness values, so a low-resolution or even slightly blurry photo works fine. What matters more is the composition: zoom in on a face and make sure there's good contrast between the subject and the background."
        }
      },
      {
        "@type": "Question",
        "name": "How long does it take to build?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A small 20x20 portrait (400 dice) might take 2 to 4 hours. A medium 40x40 piece (1,600 dice) can take a full day or two. Using Diceify's builder speeds things up significantly because it zooms in on your current position, tells you how many continuous dice of the same value to place, and tracks your overall progress."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between dice art and pixel art?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Both are grid-based, but they use different elements. Pixel art uses colored squares, giving you unlimited colors. Dice art uses six-sided dice, giving you up to 12 shades (with black and white dice) and adding a three-dimensional, tactile quality that you can't get with flat media."
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
          <FAQ />
        </main>
        <Footer />
      </div>
    </>
  )
}