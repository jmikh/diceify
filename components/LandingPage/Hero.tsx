'use client'

import Link from 'next/link'
import { sendGAEvent } from '@next/third-parties/google'
import { getVisibleBlogPosts } from '@/lib/blogs/data'
import BlogCard from '@/components/BlogCard'

import Image from 'next/image'

export default function Hero() {
    // Take up to 2 blog posts for the hero visual
    const featuredBlogs = getVisibleBlogPosts().slice(0, 2)

    return (
        <section className="hero hero--centered">
            <div className="hero-content text-center mx-auto">
                <div className="flex flex-col items-center gap-4 mb-4">
                    <Image
                        src="/favicon-192x192.png"
                        alt="Diceify"
                        width={192}
                        height={192}
                        style={{ width: '5rem', height: '5rem' }}
                    />
                    <h1 className="!mb-0">Turn photos into <span className="highlight">dice art</span></h1>
                </div>
                <p className="mx-auto">Upload a photo, tune the contrast and detail, then follow our step-by-step guide to build stunning mosaic art using standard dice.</p>
                <div className="hero-buttons justify-center">
                    <Link
                        href="/editor"
                        className="btn-primary"
                        onClick={() => sendGAEvent('event', 'go_to_editor', { source: 'hero' })}
                    >
                        Start creating
                    </Link>
                    <Link href="#how" className="btn-secondary">
                        How it works
                    </Link>
                </div>
            </div>

            {/* Blog section */}
            <div className="hero-blogs-section">
                <div className="hero-badge mx-auto">
                    <span className="dot"></span>
                    New blog entries
                </div>
                <div className="hero-blogs-row">
                    {featuredBlogs.map((blog) => (
                        <BlogCard key={blog.slug} post={blog} source="hero" compact />
                    ))}
                </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/15 blur-[120px] rounded-full -z-10 pointer-events-none" />
        </section>
    )
}
