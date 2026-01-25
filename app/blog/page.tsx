import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { blogPosts } from '@/lib/blogs/data'

export const metadata: Metadata = {
    title: 'Blog | Diceify',
    description: 'Stories, tutorials, and inspiration from the Diceify community. Learn how creators around the world are using dice mosaic art.',
}

export default function BlogPage() {
    return (
        <>
            {/* Background Elements */}
            <div className="bg-gradient">
                <div className="orb one"></div>
                <div className="orb two"></div>
                <div className="orb three"></div>
            </div>
            <div className="grid-overlay"></div>

            {/* Content */}
            <div className="content relative z-[2] max-w-[1200px] mx-auto w-full px-6 py-12">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--pink)] transition-colors mb-8"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Home
                </Link>

                <header className="text-center mb-12">
                    <span className="section-label">
                        <span className="w-2 h-2 bg-[var(--pink)] rounded-full"></span>
                        Community Stories
                    </span>
                    <h1 className="font-syne text-4xl md:text-5xl font-bold text-[var(--text-primary)] mt-4">
                        The Diceify Blog
                    </h1>
                    <p className="text-[var(--text-muted)] mt-4 max-w-xl mx-auto">
                        Discover inspiring stories, tutorials, and creative ideas from our community of dice art creators.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {blogPosts.map((post) => (
                        <Link
                            key={post.slug}
                            href={`/blog/${post.slug}`}
                            className="blog-card group"
                        >
                            <div className="blog-card-image">
                                {post.featuredImage ? (
                                    <Image
                                        src={post.featuredImage}
                                        alt={post.title}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="blog-card-image-placeholder">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--pink)] opacity-50">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <path d="M21 15l-5-5L5 21" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="blog-card-content">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {post.tags.slice(0, 2).map((tag) => (
                                        <span key={tag} className="blog-tag">{tag}</span>
                                    ))}
                                </div>
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--pink)] transition-colors mb-2 line-clamp-2">
                                    {post.title}
                                </h2>
                                <p className="text-sm text-[var(--text-muted)] line-clamp-3 mb-4">
                                    {post.description}
                                </p>
                                <div className="flex items-center justify-between text-xs text-[var(--text-dim)]">
                                    <span>{post.author}</span>
                                    <span>{post.readTime}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {blogPosts.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-[var(--text-muted)]">No blog posts yet. Check back soon!</p>
                    </div>
                )}
            </div>
        </>
    )
}
