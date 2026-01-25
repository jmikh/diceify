'use client'

import Link from 'next/link'
import Image from 'next/image'
import { sendGAEvent } from '@next/third-parties/google'
import type { BlogPost } from '@/lib/blogs/data'

interface BlogCardProps {
    post: BlogPost
    /** Where the click originated from, for analytics */
    source?: string
    /** Whether to use compact sizing (for hero section) */
    compact?: boolean
}

export default function BlogCard({ post, source = 'blog', compact = false }: BlogCardProps) {
    return (
        <Link
            href={`/blog/${post.slug}`}
            className="blog-card group"
            onClick={() => sendGAEvent('event', 'blog_click', { source, slug: post.slug })}
        >
            <div className={`blog-card-image ${compact ? 'blog-card-image--compact' : ''}`}>
                {post.featuredImage ? (
                    <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
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
            <div className={`blog-card-content ${compact ? 'blog-card-content--compact' : ''}`}>
                <div className="flex flex-wrap gap-2 mb-2">
                    {post.tags.slice(0, compact ? 1 : 2).map((tag) => (
                        <span key={tag} className="blog-tag">{tag}</span>
                    ))}
                    {compact && (
                        <span className="text-[10px] text-[var(--text-dim)]">{post.readTime}</span>
                    )}
                </div>
                <h2 className={`font-semibold text-[var(--text-primary)] group-hover:text-[var(--pink)] transition-colors line-clamp-2 ${compact ? 'text-sm mb-1' : 'text-lg mb-2'}`}>
                    {post.title}
                </h2>
                {!compact && (
                    <p className="text-sm text-[var(--text-muted)] line-clamp-3 mb-4">
                        {post.description}
                    </p>
                )}
                <div className={`flex items-center justify-between text-[var(--text-dim)] ${compact ? 'text-[10px]' : 'text-xs'} mt-auto`}>
                    <span>{post.author}</span>
                    {!compact && <span>{post.readTime}</span>}
                </div>
            </div>
        </Link>
    )
}
