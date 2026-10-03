import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/seo'
import { GUIDE_AUTHOR, PILLAR_PATH, type Guide, type GuideSection } from './data'

// The shared frame of every guide: structured data (Article + BreadcrumbList), the header with byline and table
// of contents, the article body, the generator CTA, and the way back. Mirrors the /dice-art page's markup.

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

const organization = { '@type': 'Organization', name: 'Diceify', url: SITE_URL }
const author = { '@type': 'Person', name: GUIDE_AUTHOR.name, url: `${SITE_URL}${GUIDE_AUTHOR.path}` }

function articleJsonLd(g: Guide) {
    const url = `${SITE_URL}${g.path}`
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: g.title,
        description: g.description,
        url,
        image: `${SITE_URL}${g.image}`,
        datePublished: g.datePublished,
        dateModified: g.dateModified,
        author,
        publisher: {
            ...organization,
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon-192x192.png` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        isPartOf: { '@type': 'WebPage', '@id': `${SITE_URL}${PILLAR_PATH}` },
        inLanguage: 'en-US',
    }
}

function breadcrumbJsonLd(g: Guide) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Dice Art Guide', item: `${SITE_URL}${PILLAR_PATH}` },
            { '@type': 'ListItem', position: 3, name: g.h1, item: `${SITE_URL}${g.path}` },
        ],
    }
}

/** An H2 with the anchor the table of contents points at. */
export function SectionHeading({ section }: { section: GuideSection }) {
    return <h2 id={section.id}>{section.heading}</h2>
}

/** A link into the editor: never the "dice art generator" anchor (that goes to `/`), never prefetched. */
export function EditorLink({ children, className }: { children: React.ReactNode; className?: string }) {
    return <Link href="/editor" prefetch={false} className={className}>{children}</Link>
}

interface GuidePageProps {
    guide: Guide
    /** One or two sentences under the H1: the answer, not a teaser. */
    lead: React.ReactNode
    children: React.ReactNode
    /** Copy for the closing CTA box. */
    cta?: { heading: string; text: React.ReactNode }
}

export default function GuidePage({ guide, lead, children, cta }: GuidePageProps) {
    return (
        <>
            <JsonLd data={articleJsonLd(guide)} />
            <JsonLd data={breadcrumbJsonLd(guide)} />

            <div className="marketing-page max-w-[800px]">
                <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[var(--text-dim)]">
                    <ol className="flex flex-wrap items-center gap-2">
                        <li><Link href="/" className="hover:text-[var(--pink)] transition-colors">Home</Link></li>
                        <li aria-hidden>›</li>
                        <li><Link href={PILLAR_PATH} className="hover:text-[var(--pink)] transition-colors">Dice Art Guide</Link></li>
                        <li aria-hidden>›</li>
                        <li aria-current="page" className="text-[var(--text-muted)]">{guide.h1}</li>
                    </ol>
                </nav>

                <article className="blog-article">
                    <header className="mb-8">
                        <span className="section-label">
                            <span className="w-2 h-2 bg-[var(--pink)] rounded-full"></span>
                            {guide.label}
                        </span>
                        <h1 className="font-syne text-3xl md:text-5xl font-bold text-[var(--text-primary)] mt-4 leading-tight">
                            {guide.h1}
                        </h1>
                        <p className="text-[var(--text-primary)] mt-4 text-lg leading-relaxed">{lead}</p>
                        <p className="guide-byline">
                            By <Link href={GUIDE_AUTHOR.path}>{GUIDE_AUTHOR.name}</Link> · Updated {formatDate(guide.dateModified)}
                        </p>
                        <nav className="guide-toc" aria-labelledby="toc-heading">
                            <p id="toc-heading" className="guide-toc-heading">On this page</p>
                            <ol>
                                {guide.sections.map(({ id, heading }) => (
                                    <li key={id}><a href={`#${id}`}>{heading}</a></li>
                                ))}
                            </ol>
                        </nav>
                    </header>

                    <div className="blog-content frosted-glass rounded-2xl p-8 md:p-12">
                        {children}

                        <div className="blog-cta">
                            <h3>{cta?.heading ?? 'Turn your photo into a dice pattern'}</h3>
                            <p>
                                {cta?.text ?? (
                                    <>
                                        Upload a photo, pick the grid, and see the exact dice count before you buy anything.
                                        Free, no account needed.
                                    </>
                                )}
                            </p>
                            <Link href="/" className="btn-primary">Open the dice art generator</Link>
                        </div>
                    </div>
                </article>

                <div className="mt-12 text-center">
                    <Link href={PILLAR_PATH} className="btn-secondary">← Back to the dice art guide</Link>
                </div>
            </div>
        </>
    )
}
