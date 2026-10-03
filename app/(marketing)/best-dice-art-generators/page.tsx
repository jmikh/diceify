import { Metadata } from 'next'
import { pageMetadata, SITE_URL } from '@/lib/seo'
import { BEST_GENERATORS, GUIDE_AUTHOR } from '@/features/marketing/guides/data'
import BestGenerators from '@/features/marketing/guides/content/BestGenerators'

export const metadata: Metadata = {
    ...pageMetadata({
        title: BEST_GENERATORS.title,
        description: BEST_GENERATORS.description,
        path: BEST_GENERATORS.path,
        article: { publishedTime: BEST_GENERATORS.datePublished, authors: [`${SITE_URL}${GUIDE_AUTHOR.path}`] },
    }),
    authors: [{ name: GUIDE_AUTHOR.name, url: `${SITE_URL}${GUIDE_AUTHOR.path}` }],
}

export default function BestDiceArtGeneratorsPage() {
    return <BestGenerators />
}
