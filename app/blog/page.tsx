import { Metadata } from 'next'
import Link from 'next/link'
import { blogPosts } from '@/lib/blogs/data'
import BlogCard from '@/components/BlogCard'

export const metadata: Metadata = {
    title: 'Blog',
    description: 'Stories, tutorials, and inspiration from the Diceify community. Learn how creators around the world are using dice art.',
    alternates: {
        canonical: 'https://diceify.art/blog',
        languages: {
            'en': 'https://diceify.art/blog',
            'x-default': 'https://diceify.art/blog',
        },
    },
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
                        <BlogCard key={post.slug} post={post} source="blog_listing" />
                    ))}
                </div>

                <div className="blog-feature-cta mt-12">
                    <p>
                        <strong>Want to be featured?</strong> We'd love to see what you create with Diceify.
                    </p>
                    <a href="mailto:support@diceify.art?subject=Diceify Feature Submission&body=Hi! I'd like to share my dice art project.%0A%0AHere's my story:%0A%0A[Attach your photos and tell us about your process]" className="btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                        Send us your photos
                    </a>
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
