import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { pageMetadata, SITE_URL } from '@/lib/seo'
import { DICE_ART_GUIDES, GUIDE_AUTHOR, getDiceArtGuideSlugs } from '@/features/marketing/guides/data'
import SizeCalculator from '@/features/marketing/guides/content/SizeCalculator'
import BuyingDice from '@/features/marketing/guides/content/BuyingDice'
import HowToGlue from '@/features/marketing/guides/content/HowToGlue'
import BestPhotos from '@/features/marketing/guides/content/BestPhotos'

// The guide spokes under /dice-art. Each slug's facts and sections live in features/marketing/guides/data.ts;
// the copy is the matching component in features/marketing/guides/content/.

interface GuidePageProps {
    params: Promise<{ slug: string }>
}

const CONTENT: Record<string, React.ComponentType> = {
    'size-calculator': SizeCalculator,
    'buying-dice': BuyingDice,
    'how-to-glue-dice-art': HowToGlue,
    'best-photos': BestPhotos,
}

export async function generateStaticParams() {
    return getDiceArtGuideSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
    const { slug } = await params
    const guide = DICE_ART_GUIDES[slug]
    if (!guide) return { title: 'Guide Not Found' }
    return {
        ...pageMetadata({
            title: guide.title,
            description: guide.description,
            path: guide.path,
            article: { publishedTime: guide.datePublished, authors: [`${SITE_URL}${GUIDE_AUTHOR.path}`] },
        }),
        authors: [{ name: GUIDE_AUTHOR.name, url: `${SITE_URL}${GUIDE_AUTHOR.path}` }],
    }
}

export default async function DiceArtGuidePage({ params }: GuidePageProps) {
    const { slug } = await params
    const Content = CONTENT[slug]
    if (!Content || !DICE_ART_GUIDES[slug]) notFound()
    return <Content />
}
