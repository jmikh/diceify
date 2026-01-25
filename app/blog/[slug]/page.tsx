import { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { notFound } from 'next/navigation'
import { getBlogBySlug, getAllBlogSlugs } from '@/lib/blogs/data'

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
        title: `${post.title} Blog`,
        description: post.description,
        authors: [{ name: post.author, url: post.authorUrl }],
        openGraph: {
            title: `Diceify | ${post.title}`,
            description: post.description,
            type: 'article',
            publishedTime: post.date,
            authors: [post.author],
        },
    }
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

    const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    // JSON-LD structured data for better AI/search engine crawlability
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.description,
        "datePublished": post.date,
        "dateModified": post.date,
        "author": {
            "@type": "Person",
            "name": post.author,
            ...(post.authorUrl && { "url": post.authorUrl })
        },
        "publisher": {
            "@type": "Organization",
            "name": "Diceify",
            "url": "https://diceify.art",
            "logo": {
                "@type": "ImageObject",
                "url": "https://diceify.art/logo-full.svg"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://diceify.art/blog/${slug}`
        },
        "keywords": post.tags.join(", "),
        "articleSection": "Community Stories",
        "inLanguage": "en-US"
    }

    return (
        <>
            {/* JSON-LD Structured Data for AI/Search Engines */}
            <Script
                id="blog-json-ld"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
                        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                            <span>
                                By{' '}
                                {post.authorUrl ? (
                                    <a
                                        href={post.authorUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--pink)] hover:underline"
                                    >
                                        {post.author}
                                    </a>
                                ) : (
                                    post.author
                                )}
                            </span>
                            <span>•</span>
                            <span>{formattedDate}</span>
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
