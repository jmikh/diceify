export interface BlogAuthor {
    /** Person for a first-hand post, Organization when the Diceify team wrote it up. */
    type: 'Person' | 'Organization'
    name: string
    url?: string
}

export interface BlogPost {
    slug: string
    title: string
    description: string
    /** ISO date (UTC) the post was published. */
    date: string
    /** ISO date (UTC) of the last substantive edit; defaults to `date`. */
    dateModified?: string
    author: BlogAuthor
    /** The person whose build or story the post is based on, when the author is the Diceify team. */
    contributor?: BlogAuthor
    featuredImage: string
    readTime: string
    tags: string[]
    hidden?: boolean
}

export const blogPosts: BlogPost[] = [
    {
        slug: 'why-i-built-diceify',
        title: 'Why I Built Diceify',
        description: 'The story behind Diceify — a COVID project born out of frustration with existing dice art tools, and a tribute to Umm Kulthum.',
        date: '2024-01-24',
        dateModified: '2026-10-03',
        author: { type: 'Person', name: 'John Mikhail', url: 'https://diceify.art/about' },
        featuredImage: '/images/blog/why-i-built-diceify.webp',
        readTime: '5 min read',
        tags: ['Behind the Scenes', 'Story']
    },
    {
        slug: 'jeremy-dice-portraits-nieces',
        title: 'How Jeremy Made Dice Portraits for His Nieces',
        description: 'How Jeremy Klammer used Diceify to make birthday gifts for his nieces — 35×47 dice portraits (1,645 dice each) built from real dice and painted with their favorite colors.',
        date: '2023-11-21',
        dateModified: '2026-10-03',
        author: { type: 'Organization', name: 'Diceify team', url: 'https://diceify.art' },
        contributor: { type: 'Person', name: 'Jeremy Klammer', url: 'https://jeremyklammer.com' },
        featuredImage: '/images/blog/jeremy-dice-portrait.webp',
        readTime: '4 min read',
        tags: ['Community', 'Gift Ideas']
    }
]

export function getVisibleBlogPosts(): BlogPost[] {
    return blogPosts.filter(post => !post.hidden)
}

export function getBlogBySlug(slug: string): BlogPost | undefined {
    return blogPosts.find(post => post.slug === slug)
}

export function getAllBlogSlugs(): string[] {
    return blogPosts.map(post => post.slug)
}

/** "January 24, 2024" from an ISO date; UTC so the day never shifts with the build machine's zone. */
export function formatPostDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}
