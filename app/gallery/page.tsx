import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'

export const metadata: Metadata = {
    title: 'Dice Art Gallery | Portraits & Abstract Mosaics | Diceify',
    description: 'Browse dice art portraits and abstract mosaics created with Diceify. See how photos of celebrities, loved ones, and creative designs are transformed into buildable dice patterns.',
    alternates: {
        canonical: 'https://diceify.art/gallery',
        languages: {
            'en': 'https://diceify.art/gallery',
            'x-default': 'https://diceify.art/gallery',
        },
    },
    openGraph: {
        title: 'Dice Art Gallery | Portraits & Abstract Mosaics',
        description: 'Browse dice art portraits and abstract mosaics created with Diceify.',
        url: 'https://diceify.art/gallery',
        type: 'website',
    },
}

const portraits = [
    { src: '/images/dali-51x51.png', alt: 'Salvador Dali dice art portrait', name: 'Salvador Dali' },
    { src: '/images/frida-54x54.png', alt: 'Frida Kahlo dice art portrait', name: 'Frida Kahlo' },
    { src: '/images/monalisa.jpg', alt: 'Mona Lisa dice art mosaic', name: 'Mona Lisa' },
    { src: '/images/salah-61x61.png', alt: 'Mo Salah football dice art portrait', name: 'Mo Salah' },
    { src: '/images/kobe-71x71.png', alt: 'Kobe Bryant tribute dice art', name: 'Kobe Bryant' },
    { src: '/images/sharbatgula-52x52.png', alt: 'Afghan Girl famous dice portrait', name: 'Afghan Girl' },
    { src: '/images/ummkulthum58x58.png', alt: 'Umm Kulthum singer dice mosaic', name: 'Umm Kulthum' },
]

const abstract = [
    { src: '/images/abstract/abstract.png', alt: 'Abstract geometric dice art mosaic', name: 'Abstract' },
    { src: '/images/abstract/pikachu.png', alt: 'Pikachu character dice art', name: 'Pikachu' },
    { src: '/images/abstract/sun.png', alt: 'Sun dice art mosaic', name: 'Sun' },
    { src: '/images/abstract/tile1.png', alt: 'Abstract tile pattern dice art', name: 'Tile Pattern' },
    { src: '/images/abstract/tile2.png', alt: 'Abstract tile design dice art', name: 'Tile Design' },
    { src: '/images/abstract/woman.png', alt: 'Woman silhouette dice art', name: 'Woman' },
]

const allItems = [...portraits, ...abstract]

const galleryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    'name': 'Diceify Gallery - Dice Art Portraits & Mosaics',
    'description': 'A collection of dice art portraits and abstract mosaics created with Diceify. Each piece is built by hand from a generated pattern.',
    'url': 'https://diceify.art/gallery',
    'copyrightYear': 2024,
    'copyrightHolder': {
        '@type': 'Organization',
        'name': 'Diceify',
        'url': 'https://diceify.art'
    },
    'image': allItems.map((item) => ({
        '@type': 'ImageObject',
        'name': item.name,
        'description': item.alt,
        'contentUrl': `https://diceify.art${item.src}`,
        'url': `https://diceify.art${item.src}`,
        'representativeOfPage': false,
        'copyrightNotice': '© 2024 Diceify. All rights reserved.',
        'creditText': 'Created with Diceify (diceify.art)',
        'license': 'https://diceify.art/terms',
        'acquireLicensePage': 'https://diceify.art/terms',
        'creator': {
            '@type': 'Organization',
            'name': 'Diceify',
            'url': 'https://diceify.art'
        }
    }))
}

function GalleryCard({ item }: { item: { src: string; alt: string; name: string } }) {
    return (
        <div className="gallery-page-card">
            <div className="gallery-page-card-image">
                <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 280px"
                />
            </div>
            <div className="gallery-page-card-info">
                <span className="gallery-page-card-name">{item.name}</span>
            </div>
        </div>
    )
}

export default function GalleryPage() {
    return (
        <>
            <Script
                id="gallery-page-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(galleryJsonLd) }}
            />
            <Script
                id="gallery-breadcrumb-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://diceify.art" },
                            { "@type": "ListItem", "position": 2, "name": "Gallery", "item": "https://diceify.art/gallery" }
                        ]
                    })
                }}
            />

            {/* Background Elements */}
            <div className="bg-gradient">
                <div className="orb one"></div>
                <div className="orb two"></div>
                <div className="orb three"></div>
            </div>
            <div className="grid-overlay"></div>

            {/* Content */}
            <div className="content relative z-[2] max-w-[1000px] mx-auto w-full px-6 py-12">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--pink)] transition-colors mb-8"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Home
                </Link>

                <header className="mb-8">
                    <span className="section-label">
                        <span className="w-2 h-2 bg-[var(--pink)] rounded-full"></span>
                        Gallery
                    </span>
                    <h1 className="font-syne text-3xl md:text-5xl font-bold text-[var(--text-primary)] mt-4 leading-tight">
                        Dice Art Gallery
                    </h1>
                    <p className="text-[var(--text-muted)] mt-4 text-lg leading-relaxed">
                        Portraits, mosaics, and abstract designs, all created with Diceify and built by hand.
                    </p>
                </header>

                <div className="gallery-page">
                    {/* Portraits Section */}
                    <div className="gallery-page-subsection">
                        <h2 className="gallery-page-label">Portraits</h2>
                        <div className="gallery-page-grid">
                            {portraits.map((item, i) => (
                                <GalleryCard key={`portrait-${i}`} item={item} />
                            ))}
                        </div>
                    </div>

                    {/* Abstract Section */}
                    <div className="gallery-page-subsection">
                        <h2 className="gallery-page-label">Abstract</h2>
                        <div className="gallery-page-grid">
                            {abstract.map((item, i) => (
                                <GalleryCard key={`abstract-${i}`} item={item} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col items-center gap-4 mt-12 text-center">
                    <p className="text-[var(--text-muted)]">Want to create your own?</p>
                    <Link href="/editor" className="btn-primary">
                        Start creating
                    </Link>
                    <Link
                        href="/dice-art"
                        className="text-sm text-[var(--text-muted)] hover:text-[var(--pink)] transition-colors no-underline"
                    >
                        Learn how dice art works →
                    </Link>
                </div>
            </div>
        </>
    )
}
