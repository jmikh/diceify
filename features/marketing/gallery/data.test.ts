import { describe, expect, it } from 'vitest'
import {
    diceCount,
    finishedSize,
    formatSize,
    galleryCaption,
    galleryItems,
    gallerySections,
    imageGalleryJsonLd,
    imageObjectJsonLd,
    portraitItems,
    videoObjectJsonLd,
    BUILD_VIDEO,
} from './data'

const bySlug = (slug: string) => {
    const item = galleryItems.find(i => i.slug === slug)
    if (!item) throw new Error(`no gallery item ${slug}`)
    return item
}

describe('gallery derivations', () => {
    it('derives dice count and finished size at 16 mm from the grid', () => {
        expect(diceCount({ width: 51, height: 51 })).toBe(2601)
        expect(finishedSize({ width: 51, height: 51 })).toEqual({ cm: { width: 82, height: 82 }, in: { width: 32, height: 32 } })
        expect(finishedSize({ width: 71, height: 71 })!.cm.width).toBe(114)
        expect(finishedSize({ width: 50, height: 50 }, 12)!.cm.width).toBe(60)
    })

    it('formats square and non-square sizes', () => {
        expect(formatSize(finishedSize({ width: 51, height: 51 })!)).toBe('82 cm (32 in)')
        expect(formatSize(finishedSize({ width: 87, height: 77 })!)).toBe('139 × 123 cm (55 × 49 in)')
    })

    it('captions a card from the file-name grid', () => {
        expect(galleryCaption(bySlug('salvador-dali'))).toBe('51×51 grid · 2,601 dice · 82 cm (32 in) at 16 mm · Digital preview')
        expect(galleryCaption(bySlug('kobe-bryant'))).toBe('71×71 grid · 5,041 dice · 114 cm (45 in) at 16 mm · Digital preview')
    })

    it('includes the black/white split when measured and omits numbers for unknown grids', () => {
        expect(galleryCaption(bySlug('kids'))).toBe(
            '87×77 grid · 6,699 dice (4,564 black / 2,135 white) · 139 × 123 cm (55 × 49 in) at 16 mm · Digital preview',
        )
        expect(galleryCaption(bySlug('mona-lisa'))).toBe('Digital preview')
        expect(galleryCaption(bySlug('umm-kulthum-build'))).toBe('Built with real dice')
    })

    it('never carries hand-typed counts that disagree with the grid', () => {
        for (const item of galleryItems) {
            if (item.grid) {
                expect(item.diceCount).toBe(item.grid.width * item.grid.height)
                if (item.split) expect(item.split.black + item.split.white).toBe(item.diceCount)
            } else {
                expect(item.diceCount).toBeNull()
                expect(item.size).toBeNull()
            }
        }
    })

    it('has unique slugs and lists every preview exactly once across the sections', () => {
        const slugs = galleryItems.map(i => i.slug)
        expect(new Set(slugs).size).toBe(slugs.length)
        const sectioned = gallerySections.flatMap(s => s.items.map(i => i.slug)).sort()
        const previews = galleryItems.filter(i => i.kind === 'preview').map(i => i.slug).sort()
        expect(sectioned).toEqual(previews)
        expect(portraitItems.every(i => i.subject === 'portrait' && i.kind === 'preview')).toBe(true)
    })
})

describe('gallery JSON-LD', () => {
    it('claims a license only on original work', () => {
        const dali = imageObjectJsonLd(bySlug('salvador-dali'))
        expect(dali).not.toHaveProperty('license')
        expect(dali).not.toHaveProperty('creditText')
        expect(dali).not.toHaveProperty('acquireLicensePage')
        expect(dali.caption).toBe('Salvador Dalí · 51×51 grid · 2,601 dice · 82 cm (32 in) at 16 mm · Digital preview')
        expect(dali.description).toContain('generated with Diceify')
        expect(dali.description).not.toContain('built by hand')

        const sun = imageObjectJsonLd(bySlug('sun'))
        expect(sun.license).toBe('https://diceify.art/terms')
        expect(imageObjectJsonLd(bySlug('pikachu'))).not.toHaveProperty('license')
        expect(imageObjectJsonLd(bySlug('umm-kulthum-build')).description).toContain('real dice')
    })

    it('builds an ImageGallery and a VideoObject', () => {
        const gallery = imageGalleryJsonLd({ name: 'G', description: 'D', url: 'https://diceify.art/gallery', items: portraitItems })
        expect(gallery['@type']).toBe('ImageGallery')
        expect(gallery.image).toHaveLength(portraitItems.length)

        const video = videoObjectJsonLd(BUILD_VIDEO)
        expect(video).toMatchObject({
            '@type': 'VideoObject',
            name: 'Umm Kulthum in dice',
            thumbnailUrl: ['https://i.ytimg.com/vi/z4UUXeYqJZw/hqdefault.jpg'],
            embedUrl: 'https://www.youtube.com/embed/z4UUXeYqJZw',
            uploadDate: '2024-01-24',
        })
    })
})
