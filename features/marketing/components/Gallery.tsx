'use client'

import Image from 'next/image'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { pageUrl } from '@/lib/seo'
import { imageGalleryJsonLd, portraitItems } from '../gallery/data'

// The portrait previews from the gallery data module (grid, dice count and licensing live there).
const galleryJsonLd = imageGalleryJsonLd({
    name: 'Diceify Gallery - Dice Art Portraits',
    description:
        'Dice art portraits generated with Diceify from photos. Each preview is a buildable pattern with its grid size and dice count; see the full gallery for real builds.',
    url: `${pageUrl('/')}#gallery`,
    items: portraitItems,
})

const topRowItems = portraitItems.slice(0, 4)
const bottomRowItems = portraitItems.slice(4)

// Duplicate images to create a long enough strip for scrolling
const topGalleryItems = [...topRowItems, ...topRowItems, ...topRowItems, ...topRowItems, ...topRowItems, ...topRowItems]
const bottomGalleryItems = [...bottomRowItems, ...bottomRowItems, ...bottomRowItems, ...bottomRowItems, ...bottomRowItems, ...bottomRowItems]

export default function Gallery() {
    return (
        <section className="gallery" id="gallery">
            {/* JSON-LD Structured Data for Image Gallery */}
            <JsonLd data={galleryJsonLd} />

            <div className="gallery-header">
                <div>
                    <span className="section-label">Gallery</span>
                    <h2>Made with Diceify</h2>
                </div>
            </div>

            {/* Top Row - Scrolls Left */}
            <div className="gallery-marquee">
                <div className="gallery-row top">
                    {topGalleryItems.map((item, i) => (
                        <div key={`top-${i}`} className="gallery-item relative">
                            <Image
                                src={item.src}
                                alt={item.alt}
                                fill
                                className="object-cover"
                                sizes="280px"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Row - Scrolls Right */}
            <div className="gallery-marquee">
                <div className="gallery-row bottom">
                    {bottomGalleryItems.map((item, i) => (
                        <div key={`bottom-${i}`} className="gallery-item relative">
                            <Image
                                src={item.src}
                                alt={item.alt}
                                fill
                                className="object-cover"
                                sizes="280px"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center mt-8">
                <Link href="/gallery" className="btn-secondary">
                    See sizes, dice counts and real builds
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </section>
    )
}
