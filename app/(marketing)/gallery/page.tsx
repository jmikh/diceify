import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import JsonLd from '@/components/JsonLd'
import { pageMetadata, pageUrl } from '@/lib/seo'
import {
    BUILD_VIDEO,
    builtItems,
    galleryItems,
    gallerySections,
    imageGalleryJsonLd,
    videoObjectJsonLd,
} from '@/features/marketing/gallery/data'
import GalleryCard from '@/features/marketing/gallery/GalleryCard'
import LazyYouTube from '@/features/marketing/gallery/LazyYouTube'

export const metadata: Metadata = pageMetadata({
    title: 'Dice Art Examples: Portraits With Dice Counts',
    description:
        'Dice art examples with grid size and dice count for each, from a 51×51 Dalí (2,601 dice) to a 71×71 Kobe Bryant (5,041 dice), plus a real build on video. Make yours free.',
    path: '/gallery',
})

const GALLERY_URL = pageUrl('/gallery')

/** The first cards on the page get eager + fetchpriority=high (the mobile LCP); the rest lazy-load. */
const PRIORITY_CARDS = 4
const priorityFor = (item: { slug: string }) => galleryItems.findIndex(i => i.slug === item.slug) < PRIORITY_CARDS

const galleryJsonLd = imageGalleryJsonLd({
    name: 'Dice Art Examples: Portraits With Dice Counts',
    description:
        'Dice art ideas and real builds: portraits, kids, pets, couples and abstract designs, each with its grid size, dice count and finished size at 16 mm dice. The previews are patterns generated with Diceify; the builds are photos and video of real dice.',
    url: GALLERY_URL,
    items: galleryItems,
})

const founderBuild = builtItems[0]

export default function GalleryPage() {
    return (
        <>
            <JsonLd data={galleryJsonLd} />
            <JsonLd data={videoObjectJsonLd(BUILD_VIDEO)} />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: 'Home', item: pageUrl('/') },
                        { '@type': 'ListItem', position: 2, name: 'Gallery', item: GALLERY_URL },
                    ],
                }}
            />

            <main className="marketing-page max-w-[1000px]">
                <header className="mb-8">
                    <span className="section-label">
                        <span className="w-2 h-2 bg-[var(--pink)] rounded-full"></span>
                        Gallery
                    </span>
                    <h1 className="font-syne text-3xl md:text-5xl font-bold text-[var(--text-primary)] mt-4 leading-tight">
                        Dice art ideas &amp; real builds
                    </h1>
                    <div className="text-[var(--text-muted)] mt-4 text-lg leading-relaxed space-y-4">
                        <p>
                            Looking for dice art ideas? Every preview below was generated with Diceify from an ordinary photo,
                            and every card shows the grid, how many dice it takes and how big the finished piece is with
                            standard 16 mm dice, so you can tell a weekend project from a wall-sized one at a glance. Start
                            with the real builds to see what the dice look like once they are glued down.
                        </p>
                        <p>
                            What makes a good subject: a tight crop on one face (or one pet), strong contrast between the
                            subject and the background, and even light. Dice give you twelve shades at most, so a photo that
                            already reads well in black and white turns into dice art that reads from across the room, while
                            busy backgrounds and group shots turn to noise. There is more on this in{' '}
                            <Link href="/dice-art/best-photos">which photos work best</Link>.
                        </p>
                        <p>
                            Popular sizes: most first builds land between 30×30 (900 dice, about 48 cm / 19 in) and 50×50
                            (2,500 dice, 80 cm / 31 in); the portraits here run from 51×51 to 71×71. Use the{' '}
                            <Link href="/dice-art/size-calculator">size calculator</Link> for the count and cost of any
                            grid, read <Link href="/dice-art">how dice art works</Link> for the maths behind the shades, or
                            upload a photo to the <Link href="/">dice art generator</Link> and see your own.
                        </p>
                    </div>
                </header>

                <div className="gallery-page">
                    {/* Real builds: photo + video of real dice, before any digital preview */}
                    <section className="gallery-page-subsection" aria-labelledby="real-builds">
                        <h2 id="real-builds" className="gallery-page-label">Real builds</h2>
                        <div className="grid md:grid-cols-2 gap-5 items-start">
                            <figure className="gallery-page-card m-0">
                                <div className="relative aspect-[1024/568]">
                                    <Image
                                        src={founderBuild.src}
                                        alt={founderBuild.alt}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 90vw, 470px"
                                        priority={priorityFor(founderBuild)}
                                    />
                                </div>
                                <figcaption className="px-4 py-3 flex flex-col gap-1">
                                    <span className="gallery-page-card-name">{founderBuild.title}</span>
                                    <span className="text-xs text-[var(--text-dim)] leading-snug">
                                        Built with real dice · John Mikhail, Diceify&apos;s founder
                                    </span>
                                    <Link
                                        href="/blog/why-i-built-diceify"
                                        className="mt-1 text-xs font-semibold text-[var(--pink)] no-underline hover:underline"
                                    >
                                        Read the story →
                                    </Link>
                                </figcaption>
                            </figure>
                            <figure className="m-0 flex flex-col gap-2">
                                <LazyYouTube
                                    youtubeId={BUILD_VIDEO.youtubeId}
                                    title={BUILD_VIDEO.name}
                                    thumbnailUrl={BUILD_VIDEO.thumbnailUrl}
                                />
                                <figcaption className="text-xs text-[var(--text-dim)] leading-snug px-1">
                                    <span className="text-[var(--text-primary)] font-semibold">{BUILD_VIDEO.name}</span>: the
                                    whole build, row by row, with the builder on a phone.
                                </figcaption>
                            </figure>
                        </div>
                        <p className="text-[var(--text-muted)] mt-5 leading-relaxed">
                            Jeremy Klammer built two 35×47 dice portraits (1,645 dice each) of his nieces as birthday gifts and
                            painted the dice in their favourite colours:{' '}
                            <Link href="/blog/jeremy-dice-portraits-nieces">read how he made them</Link>. Built one yourself?{' '}
                            <a href="mailto:support@diceify.art">Send us a photo</a> and we will add it here with credit.
                        </p>
                    </section>

                    {gallerySections.map(section => (
                        <section key={section.id} className="gallery-page-subsection" aria-labelledby={section.id}>
                            <h2 id={section.id} className="gallery-page-label">{section.title}</h2>
                            <p className="text-[var(--text-muted)] -mt-3 mb-5">{section.blurb}</p>
                            <div className="gallery-page-grid">
                                {section.items.map(item => (
                                    <GalleryCard key={item.slug} item={item} priority={priorityFor(item)} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Closing CTA band */}
                <div className="blog-cta">
                    <h3 className="font-syne text-2xl font-bold text-[var(--text-primary)]">Make one from your own photo</h3>
                    <p className="text-[var(--text-muted)] mb-6">
                        Upload a photo, pick a grid, and get the exact black and white dice count before you buy a single die.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <Link href="/editor" prefetch={false} className="btn-primary">
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
            </main>
        </>
    )
}
