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
                    </header>

                    <div className="blog-content frosted-glass rounded-2xl p-8 md:p-12">

                        {/* Section 1: What is Dice Art */}
                        <h2>What is dice art?</h2>
                        <p>
                            Dice art is a form of <strong>mosaic art</strong> where standard six-sided dice are arranged in a grid
                            to recreate an image. Each die face (1 dot through 6 dots) acts as a different shade of gray. When
                            hundreds or thousands of dice are placed together, the individual faces blend into a cohesive image,
                            much like pixels on a screen.
                        </p>
                        <p>
                            The concept is rooted in a simple principle: <strong>brightness mapping</strong>. A die showing 1
                            (mostly white surface, tiny dot) represents light areas, while a die showing 6 (heavily dotted,
                            darker) represents shadows.
                        </p>

                        <h2>Why black and white dice together?</h2>
                        <p>
                            Most people think of dice art using only black dice with white pips. That works, but it only gives
                            you <strong>6 brightness levels</strong> to work with. The result can feel flat or hard to read.
                        </p>
                        <p>
                            By combining <strong>black dice (white pips) and white dice (black pips)</strong>, you unlock
                            <strong> 12 distinct brightness levels</strong>. A white die showing 1 (nearly all white) is the
                            lightest possible shade, while a black die showing 6 (nearly all black) is the darkest. This
                            doubled range produces noticeably clearer, more detailed portraits with smoother gradients
                            and better contrast.
                        </p>
                        <p>
                            Using only white dice does <em>not</em> produce recognizable images because the contrast between a white
                            surface and black pips simply isn't enough range. So your options are: <strong>black + white
                                dice</strong> (best quality) or <strong>black dice only</strong> (simpler but inferior).
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
                            Dice art portraits of Salvador Dali, Frida Kahlo, and the Mona Lisa, all made with{' '}
                            <Link href="/editor" className="text-[var(--pink)] hover:underline">Diceify</Link>.
                        </p>

                        {/* Section 2: Types of Dice Art */}
                        <h2>Types of dice art</h2>
                        <p>
                            The most common form of dice art is the <strong>dice portrait</strong>: a photograph of
                            a face converted into a grid of dice. These are often made as personalized gifts, tributes,
                            or home décor. But dice art isn't limited to portraits:
                        </p>
                        <ul>
                            <li>
                                <strong>Dice portraits</strong>: the most popular form. A photograph (usually a face)
                                converted to a dice grid. Great for gifts, memorials, and fan art.
                            </li>
                            <li>
                                <strong>Dice mosaics</strong>: any image turned into dice, including logos, icons, famous
                                paintings, album covers, or pop culture art.
                            </li>
                            <li>
                                <strong>Large-scale dice art</strong>: wall-sized installations using thousands or
                                tens of thousands of dice. Often commissioned for events, offices, or public spaces.
                            </li>
                        </ul>

                        {/* Section: Dice Art as a Gift */}
                        <h2>Dice art as a gift</h2>
                        <p>
                            One of the reasons dice art has become so popular is that it makes an incredibly
                            <strong> personal and unique gift</strong>. Unlike something you'd pick up at a store, a dice
                            portrait is handmade. The person building it spends hours placing each die, one at a time,
                            and that time and effort is part of what makes it meaningful.
                        </p>
                        <p>
                            You can create dice art of <strong>loved ones, pets, celebrities, or any image that matters
                                to the person</strong> receiving it. Because it's generated from a personal photo, no two
                            pieces are alike. It's a truly one-of-a-kind gift that you won't find anywhere else.
                        </p>
                        <p>
                            Dice portraits make great gifts for birthdays, weddings, graduations, memorials, or just
                            because. The building process itself can be a fun project, and some people even build them
                            together with the person they're gifting it to.
                        </p>

                        {/* Section: How It Works */}
                        <h2>How dice art works: the brightness mapping principle</h2>
                        <p>
                            The core idea behind all dice art is <strong>brightness mapping</strong>. Here's how it works:
                        </p>
                        <ol className="list-decimal pl-6 mb-5 space-y-2 text-[var(--text-secondary)]">
                            <li>
                                <strong>Convert the image to grayscale.</strong> Strip away color so each pixel has a
                                single brightness value.
                            </li>
                            <li>
                                <strong>Divide into a grid.</strong> Split the image into cells, where each cell represents
                                one die. Each cell aggregates a group of neighboring pixels into a single average
                                brightness, which is why even low-resolution images work perfectly fine.
                            </li>
                            <li>
                                <strong>Map brightness to die faces.</strong> For each cell, assign a die color (black or
                                white) and face number. With both colors, you get 12 distinct shades across the full
                                brightness range.
                            </li>
                            <li>
                                <strong>Build the grid.</strong> Place physical dice on a board or frame following the
                                pattern, one row at a time.
                            </li>
                        </ol>
                        <p>
                            This is exactly what a{' '}
                            <Link href="/editor" className="text-[var(--pink)] hover:underline">dice art generator</Link>{' '}
                            automates. You upload a photo, and it calculates the optimal die color and face for every
                            cell in the grid.
                        </p>

                        {/* Section: How to Get Started */}
                        <h2>How to make your own dice art</h2>
                        <p>
                            Making dice art is surprisingly straightforward. Here's the basic process:
                        </p>
                        <h3>1. Choose your image</h3>
                        <p>
                            The best images for dice art are <strong>zoomed-in</strong> and have <strong>clear contrast
                                between the subject and background</strong>. You don't need a high-resolution photo since
                            the generator downscales and aggregates pixels anyway, so even a casual phone photo works well.
                        </p>
                        <p>
                            A few tips for picking the right image:
                        </p>
                        <ul>
                            <li>
                                <strong>Zoom in on a single face.</strong> Family photos can work, but crop to focus on
                                one person. The more of the grid the face fills, the more detail you'll see.
                            </li>
                            <li>
                                <strong>Look for hair-to-background contrast.</strong> Dark hair against a light
                                background produces great results. Blonde or lighter hair works best against a darker
                                background.
                            </li>
                            <li>
                                <strong>High-contrast lighting helps.</strong> Photos with clear light and shadow on
                                the face create more dramatic, readable dice portraits.
                            </li>
                        </ul>
                        <h3>2. Generate your pattern</h3>
                        <p>
                            Use a tool like <Link href="/editor" className="text-[var(--pink)] hover:underline">Diceify</Link>{' '}
                            to convert your photo into a dice grid. The tool will tell you exactly how many dice you
                            need and let you preview the result in real time.
                        </p>
                        <p>
                            Crucially, you can <strong>adjust contrast and brightness</strong> to dial in the look
                            before you start building. Increasing contrast can make facial features pop, while tweaking
                            brightness helps when the original photo is too dark or washed out. These adjustments make
                            a huge difference in how recognizable and beautiful the final piece turns out.
                        </p>
                        <h3>3. Gather your materials</h3>
                        <p>
                            You'll need: standard 16mm dice in both black and white (buy in bulk), a frame or backing
                            board, and adhesive (wood glue or epoxy). A ruler or straight edge helps keep rows aligned.
                        </p>
                        <h3>4. Build it</h3>
                        <p>
                            Follow the pattern row by row. Diceify's{' '}
                            <Link href="/editor" className="text-[var(--pink)] hover:underline">step-by-step builder</Link>{' '}
                            highlights your current position and tells you exactly which die to place next, so you never
                            lose your place or miscount.
                        </p>

                        <div className="blog-note">
                            <strong>Pro tip:</strong> Start from a corner and work in one direction. If you're gluing as
                            you go, give each row a minute to set before starting the next one. This prevents dice from
                            shifting as you work.
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
                        <h2>Frequently asked questions about dice art</h2>

                        <h3>How long does it take to build a dice portrait?</h3>
                        <p>
                            It depends on the size. A small 20×20 portrait (400 dice) might take 2–4 hours. A medium
                            40×40 piece (1,600 dice) can take a full day or two. Larger projects (50×50 and above)
                            often take multiple sessions spread over several days.
                        </p>
                        <p>
                            Using a tool like{' '}
                            <Link href="/editor" className="text-[var(--pink)] hover:underline">Diceify</Link>{' '}
                            speeds things up significantly compared to working from a static blueprint. Instead of
                            eyeballing which die goes where, the builder zooms in on your current position, tells you
                            how many continuous dice of the same value to place in a row, and tracks your overall progress.
                            That means less time counting and recounting, and more time actually building.
                        </p>

                        <h3>Where can I buy dice in bulk?</h3>
                        <p>
                            Amazon, gaming supply stores, and educational supply stores sell dice in bulk packs of 100–1,000.
                            Look for uniform 16mm white dice with black pips. These give the cleanest look for dice art.
                        </p>

                        <h3>Should I use black dice, white dice, or both?</h3>
                        <p>
                            For the best results, use <strong>both black and white dice</strong>. This gives you 12
                            brightness levels instead of 6, producing much clearer images with smoother shading.
                            Black dice alone still work and some people prefer the look, but the detail is noticeably
                            reduced. White dice alone don't produce recognizable images because there isn't enough contrast
                            range between a white surface and small black pips.
                        </p>

                        <h3>Do I need a high-quality photo?</h3>
                        <p>
                            No. Dice art generators downscale your image by aggregating groups of pixels into single
                            brightness values, so a low-resolution or even slightly blurry photo works fine. What matters
                            more is the <em>composition</em>. Zoom in on a face and make sure there's good contrast
                            between the subject and the background.
                        </p>

                        <h3>What's the difference between dice art and pixel art?</h3>
                        <p>
                            Both are grid-based, but they use different elements. Pixel art uses colored squares (like
                            screen pixels or Perler beads), giving you unlimited colors. Dice art uses six-sided dice,
                            giving you up to 12 shades (with black and white dice) and adding a three-dimensional,
                            tactile quality that you can't get with flat media.
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
