'use client'

import Image from 'next/image'
import Script from 'next/script'

const galleryItems = [
    { src: '/images/dali-51x51.png', alt: 'Salvador Dali dice art mosaic', name: 'Salvador Dali Dice Art Mosaic' },
    { src: '/images/frida-54x54.png', alt: 'Frida Kahlo portrait made of dice', name: 'Frida Kahlo Dice Portrait' },
    { src: '/images/monalisa.jpg', alt: 'Mona Lisa dice mosaic art', name: 'Mona Lisa Dice Mosaic' },
    { src: '/images/salah-61x61.png', alt: 'Mo Salah football player dice art', name: 'Mo Salah Dice Art' },
    { src: '/images/kobe-71x71.png', alt: 'Kobe Bryant tribute in dice', name: 'Kobe Bryant Dice Tribute' },
    { src: '/images/sharbatgula-52x52.png', alt: 'Afghan Girl famous portrait in dice', name: 'Afghan Girl Dice Portrait' },
    { src: '/images/ummkulthum58x58.png', alt: 'Umm Kulthum singer dice mosaic', name: 'Umm Kulthum Dice Mosaic' },
]

// JSON-LD structured data for the image gallery
const galleryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    'name': 'Diceify Gallery - Dice Art Mosaics',
    'description': 'A collection of stunning dice art mosaics and portraits created with Diceify. Transform photos into buildable dice patterns featuring famous figures and artwork.',
    'url': 'https://diceify.art/#gallery',
    'image': galleryItems.map((item) => ({
        '@type': 'ImageObject',
        'name': item.name,
        'description': item.alt,
        'contentUrl': `https://diceify.art${item.src}`,
        'url': `https://diceify.art${item.src}`,
        'representativeOfPage': false,
        'creator': {
            '@type': 'Organization',
            'name': 'Diceify',
            'url': 'https://diceify.art'
        }
    }))
}

const topRowItems = galleryItems.slice(0, 4)
const bottomRowItems = galleryItems.slice(4)

// Duplicate images to create a long enough strip for scrolling
const topGalleryItems = [...topRowItems, ...topRowItems, ...topRowItems, ...topRowItems, ...topRowItems, ...topRowItems]
const bottomGalleryItems = [...bottomRowItems, ...bottomRowItems, ...bottomRowItems, ...bottomRowItems, ...bottomRowItems, ...bottomRowItems]

export default function Gallery() {
    return (
        <section className="gallery" id="gallery">
            {/* JSON-LD Structured Data for Image Gallery */}
            <Script
                id="gallery-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(galleryJsonLd) }}
            />

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
        </section>
    )
}
