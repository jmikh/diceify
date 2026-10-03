import { SITE_URL } from '@/lib/seo'

// Gallery items for /gallery and the homepage marquee. Grid sizes come from the image file names
// (`dali-51x51`) or were measured from the image (hero pairs, mirrored from Hero.tsx); counts and
// finished sizes are derived here, never typed by hand. `grid: null` = not reliably known, so the
// card shows no numbers rather than a guess.

/** Standard die edge used for the finished-size figures. */
export const DIE_SIZE_MM = 16
const CM_PER_IN = 2.54

export type GallerySubject = 'portrait' | 'kids' | 'pets' | 'couples' | 'abstract'
/** 'preview' = a Diceify render of the pattern; 'built' = a photo of real dice. */
export type GalleryKind = 'preview' | 'built'

export interface GalleryGrid {
    width: number
    height: number
}

export interface GallerySplit {
    black: number
    white: number
}

interface Dimensions {
    width: number
    height: number
}

export interface GallerySource {
    slug: string
    title: string
    src: string
    alt: string
    subject: GallerySubject
    kind: GalleryKind
    grid: GalleryGrid | null
    /** Black / white die counts, when they were measured from the image. */
    split?: GallerySplit
    /**
     * True when the source is Diceify's own (its photos, original designs, public-domain works): the
     * ImageObject then carries license/credit fields. False for renders of third-party photos or characters.
     */
    original: boolean
    /** Why the source works as dice art; shown on the card. */
    notes?: string
}

export interface GalleryItem extends GallerySource {
    diceCount: number | null
    /** Finished size at `DIE_SIZE_MM` dice, whole units. */
    size: { cm: Dimensions; in: Dimensions } | null
}

export const KIND_LABEL: Record<GalleryKind, string> = {
    preview: 'Digital preview',
    built: 'Built with real dice',
}

/** The founder's build video, embedded on /gallery (and the source of its VideoObject). */
export const BUILD_VIDEO = {
    youtubeId: 'z4UUXeYqJZw',
    name: 'Umm Kulthum in dice',
    description:
        'John Mikhail, the founder of Diceify, builds a dice portrait of the Egyptian singer Umm Kulthum from start to finish, placing real dice row by row with the Diceify builder.',
    thumbnailUrl: 'https://i.ytimg.com/vi/z4UUXeYqJZw/hqdefault.jpg',
    embedUrl: 'https://www.youtube.com/embed/z4UUXeYqJZw',
    contentUrl: 'https://www.youtube.com/watch?v=z4UUXeYqJZw',
    /** Not verifiable from YouTube at build time; the blog post that embeds it was published this day. */
    uploadDate: '2024-01-24',
}

const SOURCES: GallerySource[] = [
    // Real builds first: the only photo of a physical piece.
    {
        slug: 'umm-kulthum-build',
        title: 'Umm Kulthum, built',
        src: '/images/blog/why-i-built-diceify.webp',
        alt: "John Mikhail placing real dice on his Umm Kulthum dice portrait, with the Diceify builder open on a phone next to the frame",
        subject: 'portrait',
        kind: 'built',
        grid: null,
        original: true,
        notes: "The founder's own build, placed one die at a time with the builder on a phone.",
    },

    // Portraits (digital previews; the grid is in each file name).
    {
        slug: 'salvador-dali',
        title: 'Salvador Dalí',
        src: '/images/dali-51x51.webp',
        alt: 'Salvador Dalí dice art portrait, 51×51 grid digital preview',
        subject: 'portrait',
        kind: 'preview',
        grid: { width: 51, height: 51 },
        original: false,
        notes: 'Hard side light and a moustache you can read from across the room.',
    },
    {
        slug: 'frida-kahlo',
        title: 'Frida Kahlo',
        src: '/images/frida-54x54.webp',
        alt: 'Frida Kahlo dice art portrait, 54×54 grid digital preview',
        subject: 'portrait',
        kind: 'preview',
        grid: { width: 54, height: 54 },
        original: false,
        notes: 'A straight-on face with dark hair against a plain background.',
    },
    {
        slug: 'mona-lisa',
        title: 'Mona Lisa',
        src: '/images/monalisa.webp',
        alt: 'Mona Lisa dice art mosaic, digital preview',
        subject: 'portrait',
        kind: 'preview',
        grid: null,
        original: true,
        notes: 'Soft tonal gradients: this one needs both black and white dice to hold the shading.',
    },
    {
        slug: 'mo-salah',
        title: 'Mo Salah',
        src: '/images/salah-61x61.webp',
        alt: 'Mo Salah dice art portrait, 61×61 grid digital preview',
        subject: 'portrait',
        kind: 'preview',
        grid: { width: 61, height: 61 },
        original: false,
        notes: 'A dark background and a tight crop keep the detail in the face.',
    },
    {
        slug: 'kobe-bryant',
        title: 'Kobe Bryant',
        src: '/images/kobe-71x71.webp',
        alt: 'Kobe Bryant dice art portrait, 71×71 grid digital preview',
        subject: 'portrait',
        kind: 'preview',
        grid: { width: 71, height: 71 },
        original: false,
        notes: 'The largest grid here: 71×71 holds the detail of a full head-and-shoulders crop.',
    },
    {
        slug: 'afghan-girl',
        title: 'Afghan Girl',
        src: '/images/sharbatgula-52x52.webp',
        alt: 'Afghan Girl dice art portrait, 52×52 grid digital preview',
        subject: 'portrait',
        kind: 'preview',
        grid: { width: 52, height: 52 },
        original: false,
        notes: 'The eyes carry the image: contrast around them matters more than anywhere else.',
    },
    {
        slug: 'umm-kulthum',
        title: 'Umm Kulthum',
        src: '/images/ummkulthum58x58.webp',
        alt: 'Umm Kulthum dice art portrait, 58×58 grid digital preview',
        subject: 'portrait',
        kind: 'preview',
        grid: { width: 58, height: 58 },
        original: false,
        notes: 'The singer whose portrait the founder built; see Real builds above.',
    },

    // Kids / pets / couples: the homepage hero pairs. Grid and split measured from each `-dice.webp`
    // (the same figures as Hero.tsx; update both with the image).
    {
        slug: 'kids',
        title: 'Kids',
        src: '/images/hero/kids-dice.webp',
        alt: 'Portrait of a smiling boy turned into dice art, 87×77 grid digital preview',
        subject: 'kids',
        kind: 'preview',
        grid: { width: 87, height: 77 },
        split: { black: 4564, white: 2135 },
        original: false,
        notes: 'A big smile and a plain background: the kind of snapshot that turns into dice art without any editing.',
    },
    {
        slug: 'pets',
        title: 'Pets',
        src: '/images/hero/pets-dice.webp',
        alt: 'Portrait of a tabby cat turned into dice art, 75×65 grid digital preview',
        subject: 'pets',
        kind: 'preview',
        grid: { width: 75, height: 65 },
        split: { black: 2093, white: 2782 },
        original: false,
        notes: 'Fur stripes become die faces; crop to the head so the eyes get the dice.',
    },
    {
        slug: 'couples',
        title: 'Couples',
        src: '/images/hero/couples-dice.webp',
        alt: 'Portrait of a smiling couple turned into dice art, 81×71 grid digital preview',
        subject: 'couples',
        kind: 'preview',
        grid: { width: 81, height: 71 },
        split: { black: 3110, white: 2641 },
        original: false,
        notes: 'Two faces close together: crop tight so each face still gets enough dice.',
    },

    // Abstract and original designs (grid not recorded for these renders).
    {
        slug: 'geometric',
        title: 'Geometric abstract',
        src: '/images/abstract/abstract.webp',
        alt: 'Abstract geometric dice art mosaic, digital preview',
        subject: 'abstract',
        kind: 'preview',
        grid: null,
        original: true,
        notes: 'Flat shapes with hard edges: every block is a run of the same die, which makes it a fast build.',
    },
    {
        slug: 'pikachu',
        title: 'Pikachu',
        src: '/images/abstract/pikachu.webp',
        alt: 'Pikachu character dice art, digital preview',
        subject: 'abstract',
        kind: 'preview',
        grid: null,
        original: false,
        notes: 'Cartoon outlines map cleanly onto black dice; the flat fills onto white.',
    },
    {
        slug: 'sun',
        title: 'Sun',
        src: '/images/abstract/sun.webp',
        alt: 'Sun dice art mosaic, digital preview',
        subject: 'abstract',
        kind: 'preview',
        grid: null,
        original: true,
        notes: 'Radial symmetry forgives small placement errors.',
    },
    {
        slug: 'tile-pattern-1',
        title: 'Tile pattern I',
        src: '/images/abstract/tile1.webp',
        alt: 'Abstract tile pattern dice art, digital preview',
        subject: 'abstract',
        kind: 'preview',
        grid: null,
        original: true,
        notes: 'A repeating motif: build one tile, then repeat it.',
    },
    {
        slug: 'tile-pattern-2',
        title: 'Tile pattern II',
        src: '/images/abstract/tile2.webp',
        alt: 'Abstract tile design dice art, digital preview',
        subject: 'abstract',
        kind: 'preview',
        grid: null,
        original: true,
        notes: 'Mid-grey faces (3s and 4s) do the work in a pattern like this.',
    },
    {
        slug: 'woman-silhouette',
        title: 'Woman silhouette',
        src: '/images/abstract/woman.webp',
        alt: 'Woman silhouette dice art, digital preview',
        subject: 'abstract',
        kind: 'preview',
        grid: null,
        original: true,
        notes: 'High-contrast illustration: mostly 1s and 6s, so it reads from far away.',
    },
]

export function diceCount(grid: GalleryGrid): number {
    return grid.width * grid.height
}

/** Finished size of a grid at `dieMm` dice, rounded to whole cm and inches. */
export function finishedSize(grid: GalleryGrid, dieMm = DIE_SIZE_MM): GalleryItem['size'] {
    const cm = { width: (grid.width * dieMm) / 10, height: (grid.height * dieMm) / 10 }
    return {
        cm: { width: Math.round(cm.width), height: Math.round(cm.height) },
        in: { width: Math.round(cm.width / CM_PER_IN), height: Math.round(cm.height / CM_PER_IN) },
    }
}

function toItem(source: GallerySource): GalleryItem {
    return {
        ...source,
        diceCount: source.grid ? diceCount(source.grid) : null,
        size: source.grid ? finishedSize(source.grid) : null,
    }
}

/** Every gallery item in page order: the real build first, then portraits, hero pairs, abstract. */
export const galleryItems: GalleryItem[] = SOURCES.map(toItem)

export const builtItems = galleryItems.filter(item => item.kind === 'built')

const previewsOf = (...subjects: GallerySubject[]) =>
    galleryItems.filter(item => item.kind === 'preview' && subjects.includes(item.subject))

export interface GallerySection {
    id: string
    title: string
    blurb: string
    items: GalleryItem[]
}

/** The preview sections of /gallery. */
export const gallerySections: GallerySection[] = [
    {
        id: 'portraits',
        title: 'Portraits',
        blurb: 'Famous faces at 51×51 to 71×71: the sizes most people build as a centrepiece.',
        items: previewsOf('portrait'),
    },
    {
        id: 'kids-pets-couples',
        title: 'Kids, pets and couples',
        blurb: 'Everyday photos, the way most gifts start. Non-square grids follow the crop.',
        items: previewsOf('kids', 'pets', 'couples'),
    },
    {
        id: 'abstract',
        title: 'Abstract and characters',
        blurb: 'Flat shapes and outlines: fewer shades, faster builds.',
        items: previewsOf('abstract'),
    },
]

/** The portrait previews, for the homepage marquee. */
export const portraitItems = previewsOf('portrait')

const formatCount = (n: number) => n.toLocaleString('en-US')

export const formatGrid = (grid: GalleryGrid) => `${grid.width}×${grid.height}`

/** "82 cm (32 in)" for a square, "139 × 123 cm (55 × 48 in)" otherwise. */
export function formatSize(size: NonNullable<GalleryItem['size']>): string {
    const square = size.cm.width === size.cm.height
    const dims = (d: Dimensions, unit: string) => (square ? `${d.width} ${unit}` : `${d.width} × ${d.height} ${unit}`)
    return `${dims(size.cm, 'cm')} (${dims(size.in, 'in')})`
}

/** The data line under a card: "51×51 grid · 2,601 dice · 82 cm (32 in) at 16 mm · Digital preview". */
export function galleryCaption(item: GalleryItem): string {
    const parts: string[] = []
    if (item.grid && item.diceCount && item.size) {
        const split = item.split ? ` (${formatCount(item.split.black)} black / ${formatCount(item.split.white)} white)` : ''
        parts.push(`${formatGrid(item.grid)} grid`, `${formatCount(item.diceCount)} dice${split}`, `${formatSize(item.size)} at ${DIE_SIZE_MM} mm`)
    }
    parts.push(KIND_LABEL[item.kind])
    return parts.join(' · ')
}

const ORGANIZATION = { '@type': 'Organization', name: 'Diceify', url: SITE_URL }

/** A schema.org ImageObject; license and credit only on Diceify's own work. */
export function imageObjectJsonLd(item: GalleryItem) {
    const url = `${SITE_URL}${item.src}`
    const caption = `${item.title} · ${galleryCaption(item)}`
    const what = item.kind === 'built' ? 'A photo of a dice portrait built with real dice' : 'A dice art pattern generated with Diceify'
    return {
        '@type': 'ImageObject',
        name: item.title,
        caption,
        description: `${what}: ${galleryCaption(item)}.${item.notes ? ` ${item.notes}` : ''}`,
        contentUrl: url,
        url,
        representativeOfPage: false,
        ...(item.original && {
            creditText: 'Diceify (diceify.art)',
            creator: ORGANIZATION,
            license: `${SITE_URL}/terms`,
            acquireLicensePage: `${SITE_URL}/terms`,
        }),
    }
}

export function imageGalleryJsonLd(gallery: { name: string; description: string; url: string; items: GalleryItem[] }) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ImageGallery',
        name: gallery.name,
        description: gallery.description,
        url: gallery.url,
        publisher: ORGANIZATION,
        image: gallery.items.map(imageObjectJsonLd),
    }
}

export function videoObjectJsonLd(video: typeof BUILD_VIDEO) {
    return {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: video.name,
        description: video.description,
        thumbnailUrl: [video.thumbnailUrl],
        uploadDate: video.uploadDate,
        embedUrl: video.embedUrl,
        contentUrl: video.contentUrl,
        publisher: ORGANIZATION,
    }
}
