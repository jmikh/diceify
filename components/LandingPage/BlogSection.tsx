import Link from 'next/link'
import { getVisibleBlogPosts } from '@/lib/blogs/data'
import BlogCard from '@/components/BlogCard'

export default function BlogSection() {
    const posts = getVisibleBlogPosts()

    return (
        <section className="blog-section" id="blog">
            <div className="section-header">
                <span className="section-label">Blog</span>
                <h2>Stories from the community</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[700px] mx-auto">
                {posts.map((post) => (
                    <BlogCard key={post.slug} post={post} source="landing" />
                ))}
            </div>
            <div className="flex justify-center mt-8">
                <Link href="/blog" className="btn-secondary">
                    View all
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </section>
    )
}
