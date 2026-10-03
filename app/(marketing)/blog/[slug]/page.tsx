import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import { pageMetadata, SITE_URL } from '@/lib/seo'
import { getBlogBySlug, getAllBlogSlugs, formatPostDate, type BlogAuthor } from '@/features/marketing/blog/data'

// Blog content components
import JeremyDicePortraits from './jeremy-dice-portraits-nieces'
import WhyIBuiltDiceify from './why-i-built-diceify'

interface BlogPageProps {
    params: Promise<{ slug: string }>
}

// Map slugs to their content components
const blogContentMap: Record<string, React.ComponentType> = {
    'jeremy-dice-portraits-nieces': JeremyDicePortraits,
    'why-i-built-diceify': WhyIBuiltDiceify,
}

export async function generateStaticParams() {
    return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
    const { slug } = await params
    const post = getBlogBySlug(slug)

    if (!post) {
        return { title: 'Blog Post Not Found' }
    }

    return {
        ...pageMetadata({
            title: post.title,
            description: post.description,
            path: `/blog/${slug}`,
            article: { publishedTime: post.date, authors: [post.author.name] },
        }),
        authors: [{ name: post.author.name, url: post.author.url }],
    }
}

const schemaPerson = ({ type, name, url }: BlogAuthor) => ({ "@type": type, "name": name, ...(url && { "url": url }) })

function AuthorLink({ author }: { author: BlogAuthor }) {
    if (!author.url) return <>{author.name}</>
    const external = !author.url.startsWith(SITE_URL)
    return (
        <a
            href={author.url}
            {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
            className="text-[var(--pink)] hover:underline"
        >
            {author.name}
        </a>
    )
}

export default async function BlogPostPage({ params }: BlogPageProps) {
    const { slug } = await params
    const post = getBlogBySlug(slug)

    if (!post) {
        notFound()
    }

    const ContentComponent = blogContentMap[slug]

    if (!ContentComponent) {
        notFound()
    }

    const postUrl = `${SITE_URL}/blog/${slug}`

    // JSON-LD structured data for better AI/search engine crawlability
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.description,
        "image": `${SITE_URL}${post.featuredImage}`,
        "datePublished": post.date,
        "dateModified": post.dateModified ?? post.date,
        "author": schemaPerson(post.author),
        ...(post.contributor && { "contributor": schemaPerson(post.contributor) }),
        "publisher": {
            "@type": "Organization",
            "name": "Diceify",
            "url": SITE_URL,
            "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/logo-full.svg`,
                "creator": {
                    "@type": "Organization",
                    "name": "Diceify",
                    "url": SITE_URL
                },
                "copyrightNotice": `© ${new Date().getUTCFullYear()} Diceify. All rights reserved.`,
                "creditText": "Created with Diceify (diceify.art)",
                "license": `${SITE_URL}/terms`,
                "acquireLicensePage": `${SITE_URL}/terms`
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": postUrl
        },
        "keywords": post.tags.join(", "),
        "articleSection": "Community Stories",
        "inLanguage": "en-US"
    }

    return (
        <>
            {/* JSON-LD Structured Data for AI/Search Engines */}
            <JsonLd data={jsonLd} />
            <JsonLd
                data={{
                    "@context": "https://schema.org",
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
                        { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${SITE_URL}/blog` },
                        { "@type": "ListItem", "position": 3, "name": post.title, "item": postUrl }
                    ]
                }}
            />

            {/* Content */}
            <div className="relative z-[2] max-w-[800px] mx-auto w-full px-6 py-12">
                <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--pink)] transition-colors mb-8"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Blog
                </Link>

                <article className="blog-article">
                    <header className="mb-8">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag) => (
                                <span key={tag} className="blog-tag">{tag}</span>
                            ))}
                        </div>
                        <h1 className="font-syne text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
                            {post.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                            <span>
                                By <AuthorLink author={post.author} />
                                {post.contributor && (
                                    <>, based on <AuthorLink author={post.contributor} />&apos;s original post</>
                                )}
                            </span>
                            <span>•</span>
                            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                            <span>•</span>
                            <span>{post.readTime}</span>
                        </div>
                    </header>

                    <div className="blog-content frosted-glass rounded-2xl p-8 md:p-12">
                        <ContentComponent />
                    </div>
                </article>

                {/* Back to Blog CTA */}
                <div className="mt-12 text-center">
                    <Link href="/blog" className="btn-secondary">
                        ← More Stories
                    </Link>
                </div>
            </div>
        </>
    )
}
