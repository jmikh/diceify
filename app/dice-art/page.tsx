import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'

export const metadata: Metadata = {
    title: 'Dice Art — The Complete Guide to Dice Portraits & Mosaics',
    description: 'Everything you need to know about dice art: what it is, how it works, the different types of dice portraits and mosaics, and how to create your own buildable dice art from any photo.',
    alternates: {
        canonical: 'https://diceify.art/dice-art',
        languages: {
            'en': 'https://diceify.art/dice-art',
            'x-default': 'https://diceify.art/dice-art',
        },
    },
    openGraph: {
        title: 'Dice Art — The Complete Guide to Dice Portraits & Mosaics',
        description: 'Everything you need to know about dice art: what it is, how it works, and how to create your own.',
        url: 'https://diceify.art/dice-art',
        type: 'article',
    },
}

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Dice Art — The Complete Guide to Dice Portraits & Mosaics",
    "description": "Everything you need to know about dice art: what it is, how it works, the different types of dice portraits and mosaics, and how to create your own.",
    "url": "https://diceify.art/dice-art",
    "datePublished": "2026-02-05",
    "dateModified": "2026-02-25",
    "author": {
        "@type": "Organization",
        "name": "Diceify",
        "url": "https://diceify.art"
    },
    "publisher": {
        "@type": "Organization",
        "name": "Diceify",
        "url": "https://diceify.art",
        "logo": {
            "@type": "ImageObject",
            "url": "https://diceify.art/favicon-192x192.png",
            "copyrightNotice": "© 2024 Diceify. All rights reserved.",
            "creditText": "Created with Diceify (diceify.art)",
            "license": "https://diceify.art/terms",
            "acquireLicensePage": "https://diceify.art/terms"
        }
    },
    "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://diceify.art/dice-art"
    },
    "keywords": "dice art, dice portrait, dice mosaic, dice art generator, how to make dice art",
    "inLanguage": "en-US"
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
                "text": "Dice art is a form of mosaic art where standard six-sided dice are arranged in a grid to recreate an image. By combining both black dice (white pips) and white dice (black pips), you get 12 distinct brightness levels instead of just 6, producing much clearer and more detailed portraits."
            }
        },
        {
            "@type": "Question",
            "name": "How many dice do I need for dice art?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "The number of dice depends on the size and detail of your design. A small dice portrait might use 400–900 dice (20×20 to 30×30 grid), a medium project around 1,600–2,500 dice (40×40 to 50×50), and large-scale installations can use 5,000 or more dice."
            }
        },
        {
            "@type": "Question",
            "name": "What kind of dice should I use for dice art?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Standard 16mm six-sided dice with pips (dots) work best. For the best results, use both black dice with white pips AND white dice with black pips. This gives you 12 brightness levels instead of 6, producing much sharper images. Black dice alone also work, but white dice alone don't produce recognizable images."
            }
        },
        {
            "@type": "Question",
            "name": "How does a dice art generator work?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "A dice art generator converts a photograph into a grid pattern by mapping pixel brightness to dice faces. The image is divided into cells, each group of pixels is averaged into a single grayscale value, and the generator assigns the optimal die color and face number for each cell. This means even low-resolution images work well."
            }
        }
    ]
}

export default function DiceArtPage() {
    return (
        <>
            <Script
                id="dice-art-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Script
                id="dice-art-faq-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <Script
                id="dice-art-breadcrumb-jsonld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://diceify.art" },
                            { "@type": "ListItem", "position": 2, "name": "Dice Art", "item": "https://diceify.art/dice-art" }
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
            <div className="content relative z-[2] max-w-[800px] mx-auto w-full px-6 py-12">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--pink)] transition-colors mb-8"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Home
                </Link>

                <article className="blog-article">
                    <header className="mb-8">
                        <span className="section-label">
                            <span className="w-2 h-2 bg-[var(--pink)] rounded-full"></span>
                            Complete Guide
                        </span>
                        <h1 className="font-syne text-3xl md:text-5xl font-bold text-[var(--text-primary)] mt-4 leading-tight">
                            Dice Art: Everything You Need to Know
                        </h1>
                        <p className="text-[var(--text-muted)] mt-4 text-lg leading-relaxed">
                            Discover how simple six-sided dice become stunning works of art, and why using both black and white dice makes all the difference.
                        </p>
                        <p className="text-sm text-[var(--text-dim)] mt-3">
                            Last updated: February 25, 2026
                        </p>
                    </header>

                    <div className="blog-content frosted-glass rounded-2xl p-8 md:p-12">

                        {/* Section 1: What is Dice Art */}
                        <h2>What is dice art?</h2>
                        <p>
                            Dice art is <strong>mosaic art made from regular six-sided dice</strong>. Each face (1 through 6)
                            reads as a different shade of gray, so when you line up enough of them in a grid, they form an image.
                        </p>

                        {/* Section 2: How It Works — Brightness Mapping */}
                        <h2>How it works: brightness mapping</h2>
                        <p>
                            Every die face covers a different amount of its surface with pips. A 1 is mostly blank,
                            a 6 is heavily dotted. That difference in coverage maps directly to brightness:
                        </p>
                        <ol className="list-decimal pl-6 mb-5 space-y-2 text-[var(--text-secondary)]">
                            <li>
                                <strong>Convert the photo to grayscale</strong> — each pixel becomes a single brightness value.
                            </li>
                            <li>
                                <strong>Divide it into a grid</strong> — each cell represents one die. A group of pixels
                                gets averaged into one brightness value, which is why even low-res photos work fine.
                            </li>
                            <li>
                                <strong>Assign a die to each cell</strong> — pick the die color and face number
                                that best matches that cell's brightness.
                            </li>
                        </ol>
                        <p>
                            That's it. A{' '}
                            <Link href="/editor" className="text-[var(--pink)] hover:underline">dice art generator</Link>{' '}
                            does all of this automatically — upload a photo and it outputs the full grid pattern.
                        </p>

                        {/* Section 3: Why Both Colors */}
                        <h2>Why use both black and white dice?</h2>
                        <p>
                            Black dice alone give you 6 shades. Add white dice (black pips) and you get <strong>12</strong> —
                            white-1 is nearly pure white, black-1 is nearly pure black, and white-6 and black-6 meet
                            in the middle. More shades means sharper detail and smoother gradients. White dice on their
                            own don't work; they lack contrast.
                        </p>

                        {/* Inline gallery preview */}
                        <div className="grid grid-cols-3 gap-3 my-8 rounded-xl overflow-hidden">
                            {[
                                { src: '/images/dali-51x51.png', alt: 'Salvador Dali dice art portrait' },
                                { src: '/images/frida-54x54.png', alt: 'Frida Kahlo dice portrait mosaic' },
                                { src: '/images/monalisa.jpg', alt: 'Mona Lisa recreated in dice art' },
                            ].map((img, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                                    <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="250px" />
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-[var(--text-dim)] text-center -mt-4 mb-8">
                            Salvador Dali, Frida Kahlo, and the Mona Lisa — all made with{' '}
                            <Link href="/editor" className="text-[var(--pink)] hover:underline">Diceify</Link>.
                        </p>

                        {/* Section 4: How to Make Your Own */}
                        <h2>How to make your own</h2>

                        <h3>1. Pick your image</h3>
                        <p>
                            Zoom in tight. The more the subject fills the frame, the more detail you'll get. You don't
                            need a high-res photo — the generator averages pixels anyway.
                        </p>
                        <ul>
                            <li>
                                <strong>Faces work best</strong> when cropped close — one person per portrait.
                            </li>
                            <li>
                                <strong>Contrast matters.</strong> Dark hair on a light background (or vice versa)
                                gives clean edges.
                            </li>
                            <li>
                                <strong>Dramatic lighting helps.</strong> Strong shadows make faces pop in dice.
                            </li>
                        </ul>

                        <h3>2. Generate the pattern</h3>
                        <p>
                            <Link href="/editor" className="text-[var(--pink)] hover:underline">Diceify</Link>{' '}
                            converts your photo into a dice grid and shows you a live preview. You can tweak
                            contrast and brightness before committing — small adjustments make a big difference
                            in how readable the final piece is.
                        </p>

                        <h3>3. Materials</h3>
                        <p>
                            Standard 16mm dice in black and white (buy in bulk), a frame or backing board,
                            and glue (wood glue or epoxy). A straight edge helps keep rows tight.
                        </p>

                        <h3>4. Build it</h3>
                        <p>
                            Follow the pattern row by row. Diceify's{' '}
                            <Link href="/editor" className="text-[var(--pink)] hover:underline">step-by-step builder</Link>{' '}
                            highlights your current position and tells you exactly which die to place next.
                        </p>

                        <div className="blog-note">
                            <strong>Tip:</strong> Start from a corner, work in one direction. If gluing, let each
                            row set for a minute before starting the next — keeps things from shifting.
                        </div>

                        {/* Section 6: Gallery Teaser */}
                        <h2>Dice art examples</h2>
                        <p>
                            Here are some dice portraits and mosaics created with Diceify, each one built by hand from a
                            generated pattern:
                        </p>

                        <div className="grid grid-cols-2 gap-3 my-8 rounded-xl overflow-hidden">
                            {[
                                { src: '/images/salah-61x61.png', alt: 'Mo Salah football player dice art portrait' },
                                { src: '/images/kobe-71x71.png', alt: 'Kobe Bryant tribute in dice art' },
                                { src: '/images/sharbatgula-52x52.png', alt: 'Afghan Girl famous dice portrait' },
                                { src: '/images/ummkulthum58x58.png', alt: 'Umm Kulthum singer dice mosaic art' },
                            ].map((img, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                                    <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="350px" />
                                </div>
                            ))}
                        </div>

                        {/* Section 7: FAQ */}
                        <h2>FAQ</h2>

                        <h3>How long does it take to build?</h3>
                        <p>
                            A small 20×20 portrait (400 dice) takes 2–4 hours. A 40×40 piece (1,600 dice) is a
                            full day. Bigger than that and you're looking at multiple sessions over a few days.
                        </p>

                        <h3>Where can I buy dice in bulk?</h3>
                        <p>
                            Amazon, gaming supply stores, and educational supply stores all sell packs of 100–1,000.
                            Get uniform 16mm dice — they give the cleanest grid.
                        </p>

                        <h3>What's the difference between dice art and pixel art?</h3>
                        <p>
                            Both are grid-based. Pixel art uses colored squares (unlimited colors). Dice art uses
                            six-sided dice (up to 12 shades) and has a physical, three-dimensional quality you
                            can't get with flat media.
                        </p>

                        {/* CTA */}
                        <div className="blog-cta">
                            <h3>Ready to create your own dice art?</h3>
                            <p>
                                Upload a photo and see it transformed into a buildable dice pattern. Free, no account required.
                            </p>
                            <Link href="/editor" className="btn-primary">
                                Start creating
                            </Link>
                        </div>

                        {/* Related Reading */}
                        <h2>Further reading</h2>
                        <ul>
                            <li>
                                <Link href="/gallery" className="text-[var(--pink)] hover:underline">
                                    Dice Art Gallery
                                </Link>{' '}
                                — browse portraits and abstract mosaics created with Diceify.
                            </li>
                            <li>
                                <Link href="/blog/why-i-built-diceify" className="text-[var(--pink)] hover:underline">
                                    Why I Built Diceify
                                </Link>{' '}
                                — the story behind Diceify and a video of building a dice portrait from scratch.
                            </li>
                            <li>
                                <Link href="/blog/jeremy-dice-portraits-nieces" className="text-[var(--pink)] hover:underline">
                                    How Jeremy Made Dice Portraits for His Nieces
                                </Link>{' '}
                                — a community story about making personalized dice art gifts.
                            </li>
                        </ul>
                    </div>
                </article>

                <div className="mt-12 text-center">
                    <Link href="/" className="btn-secondary">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </>
    )
}
