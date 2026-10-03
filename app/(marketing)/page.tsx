import { Suspense } from 'react'
import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { pageGraph, webApplicationNode, websiteNode } from '@/lib/schema'
import { DEFAULT_DESCRIPTION, pageMetadata } from '@/lib/seo'
import Navbar from '@/features/marketing/components/Navbar'
import Hero from '@/features/marketing/components/Hero'
import DicePalette from '@/features/marketing/components/DicePalette'
import Gallery from '@/features/marketing/components/Gallery'
import BlogSection from '@/features/marketing/components/BlogSection'
import Pricing from '@/features/marketing/components/Pricing'
import FAQ from '@/features/marketing/components/FAQ'
import Footer from '@/components/Footer'
import { HashScrollHandler } from '@/features/marketing/components/HashScrollHandler'
import DiceGridBackground from '@/features/marketing/components/DiceGridBackground'

export const metadata: Metadata = pageMetadata({ description: DEFAULT_DESCRIPTION, path: '/' })

// WebSite + the one WebApplication entity (`#app`, with the real plan tiers as offers). The Organization and founder
// come from the root layout; the FAQPage block is rendered by <FAQ /> from its own data.
const homeJsonLd = pageGraph(
  websiteNode('Free dice art generator for portraits and mosaics. Turn any photo into buildable dice patterns.'),
  webApplicationNode(
    'Diceify is a free dice art generator that turns photos into dice portraits and mosaics. Upload any image, tune contrast and detail, then follow step-by-step instructions to build your design by hand.',
  ),
)

export default function Home() {
  return (
    <>
      <HashScrollHandler />
      <DiceGridBackground />
      <JsonLd data={homeJsonLd} />

      {/* Content */}
      <div className="relative z-[2] max-w-[1400px] mx-auto w-full">
        <Navbar />
        <main>
          <Hero />
          <DicePalette />
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
