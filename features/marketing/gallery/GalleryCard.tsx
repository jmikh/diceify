import Image from 'next/image'
import Link from 'next/link'
import { galleryCaption, type GalleryItem } from './data'

/** One /gallery tile: the image in a fixed square (no CLS), its data caption and a way into the editor. */
export default function GalleryCard({ item, priority = false }: { item: GalleryItem; priority?: boolean }) {
    return (
        <figure className="gallery-page-card m-0">
            <div className="gallery-page-card-image">
                <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 280px"
                    // The first row is the LCP: eager + fetchpriority=high. Everything else waits for the viewport.
                    priority={priority}
                    loading={priority ? undefined : 'lazy'}
                />
            </div>
            <figcaption className="px-4 py-3 flex flex-col gap-1">
                <span className="gallery-page-card-name">{item.title}</span>
                <span className="text-xs text-[var(--text-dim)] leading-snug">{galleryCaption(item)}</span>
                {item.notes && <span className="text-xs text-[var(--text-muted)] leading-snug">{item.notes}</span>}
                <Link
                    href="/editor"
                    prefetch={false}
                    className="mt-1 text-xs font-semibold text-[var(--pink)] no-underline hover:underline"
                >
                    Make one like this →
                </Link>
            </figcaption>
        </figure>
    )
}
