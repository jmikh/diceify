export interface BlogPost {
    slug: string
    title: string
    description: string
    date: string
    author: string
    authorUrl?: string
    featuredImage: string
    readTime: string
    tags: string[]
    hidden?: boolean
}

export const blogPosts: BlogPost[] = [
    {
        slug: 'why-i-built-diceify',
        title: 'Why I Built Diceify',
        description: 'The story behind Diceify — a COVID project born out of frustration with existing dice art tools, and a tribute to Um Kulthum.',
        date: '2024-01-24',
        author: 'John Mikhail',
        featuredImage: '/images/blog/why-i-built-diceify.png',
        readTime: '5 min read',
        tags: ['Behind the Scenes', 'Story']
    },
    {
        slug: 'jeremy-dice-portraits-nieces',
        title: 'How I Made Dice Portraits for My Nieces',
        description: 'Jeremy shares how he used Diceify to make birthday gifts for his nieces — real dice arranged into portraits, painted with their favorite colors.',
        date: '2023-11-21',
        author: 'Jeremy Klammer',
        authorUrl: 'https://jeremyklammer.com',
        featuredImage: '/images/blog/jeremy-dice-portrait.png',
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
