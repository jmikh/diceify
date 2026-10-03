import Image from 'next/image'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { SITE_URL } from '@/lib/seo'
import { getBlogBySlug } from '@/features/marketing/blog/data'

const VIDEO_ID = 'z4UUXeYqJZw'
const VIDEO_TITLE = 'Umm Kulthum in dice'
const VIDEO_EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}`
const BUILD_PHOTO = '/images/blog/why-i-built-diceify.webp'

const linkClass = 'text-[var(--pink)] hover:underline'

export default function WhyIBuiltDiceify() {
    const post = getBlogBySlug('why-i-built-diceify')
    const videoJsonLd = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": VIDEO_TITLE,
        "description": "John Mikhail builds a dice portrait of the Egyptian singer Umm Kulthum from start to finish: generating the pattern with Diceify, placing the black and white dice row by row with the step-by-step Builder, and gluing the finished piece.",
        "thumbnailUrl": `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
        // The real YouTube upload date is not recorded in the repo; the post date is the closest verifiable one.
        "uploadDate": post?.date,
        "embedUrl": VIDEO_EMBED_URL,
        "contentUrl": `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        "inLanguage": "en-US",
        "publisher": { "@type": "Organization", "name": "Diceify", "url": SITE_URL },
    }

    return (
        <>
            <JsonLd data={videoJsonLd} />

            <p className="blog-lead">
                It started during COVID. I wanted to make a dice portrait of Umm Kulthum — the most famous
                Egyptian singer of all time. But when I looked for tools to help, everything I found was... frustrating.
            </p>

            <figure className="my-8">
                <Image
                    src={BUILD_PHOTO}
                    alt="The finished Umm Kulthum dice portrait: a black and white dice mosaic built with Diceify"
                    width={1024}
                    height={568}
                    className="w-full h-auto rounded-xl"
                />
                <figcaption>
                    The Umm Kulthum portrait that Diceify was built for: black and white dice placed one row at a time with the Builder.
                </figcaption>
            </figure>

            <h2>The problem with existing tools</h2>
            <p>
                None of the tools out there gave you real control. No sharpness adjustment. No proper black and
                white option. Just basic converters that spit out a pattern and left you to figure out the rest.
                (If you want to know what a converter actually does, I wrote up{' '}
                <Link href="/dice-art" className={linkClass}>how dice art works</Link>: six pip values, two dice
                colours, twelve shades.)
            </p>
            <p>
                But even when you had a decent pattern, actually building the thing was a nightmare.
            </p>

            <h2>Losing track of everything</h2>
            <p>
                Here&apos;s what would happen: you&apos;re staring at an image of your dice pattern, trying to place dice
                on a frame. You look down to grab a die, look back up, and... where was I? Which row? Which column?
                You spend more time finding your place than actually placing dice.
            </p>
            <p>
                And it gets worse. When you have a run of the same die — say, ten 5s in a row — you start placing
                them and lose count. Was that seven or eight? Better recount. This happens constantly, and it
                drastically slows down an already slow process.
            </p>

            <h2>The Builder was born</h2>
            <p>
                That&apos;s when I thought: what if there was a follow-along interface? Something that shows you exactly
                where you are. One die at a time. No guessing, no recounting, no losing your place.
            </p>
            <p>
                That&apos;s the Builder. It highlights the current position, tells you which die to place, and tracks
                your progress. You just follow along. It makes the whole process so much easier. The{' '}
                <Link href="/" className={linkClass}>dice art generator</Link> that grew around it is free to use
                for previewing a photo and counting the dice.
            </p>

            <h2>Two ways to build</h2>
            <p>
                I&apos;ve found there are two main approaches to physically building dice art:
            </p>
            <ul>
                <li><strong>Glue first, then dice:</strong> Apply glue to the base, then place each die onto the adhesive. More controlled but slower.</li>
                <li><strong>Dice first, then glue on top:</strong> Arrange all the dice dry, then apply glue or resin over the top. Much faster, but risky.</li>
            </ul>
            <p>
                I tried the second method. It&apos;s tempting because it&apos;s so much quicker. But here&apos;s the catch: if
                your top layer isn&apos;t transparent enough, or if it forms bubbles, it can mess up your entire piece.
            </p>
            <p>
                That&apos;s exactly what happened to me. So if you go that route, keep a close eye on your adhesive.
                Test it first on a small area. The{' '}
                <Link href="/dice-art#glue-and-build" className={linkClass}>glue-and-build step of the guide</Link>{' '}
                has the materials that have worked since, and{' '}
                <Link href="/blog/jeremy-dice-portraits-nieces" className={linkClass}>Jeremy&apos;s portraits of his nieces</Link>{' '}
                show the glue-first method done carefully: laid out dry, then transferred row by row.
            </p>

            <h2>I&apos;d love to hear about your process</h2>
            <p>
                Everyone builds differently. Some people have figured out tricks I&apos;ve never thought of. If you&apos;ve
                made dice art — or you&apos;re planning to — I&apos;d genuinely love to hear how you approached it.
            </p>
            <p>
                What worked? What didn&apos;t? What would you do differently next time? For ideas on what to build, the{' '}
                <Link href="/gallery" className={linkClass}>gallery</Link> shows the kinds of photos that turn into
                good dice patterns.
            </p>

            <h2>Watch the full process</h2>
            <p>
                Here&apos;s a video of me building the Umm Kulthum portrait from start to finish:
            </p>
            <div className="blog-video">
                <iframe
                    src={VIDEO_EMBED_URL}
                    title={VIDEO_TITLE}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>

            <div className="blog-cta">
                <h3>Ready to start?</h3>
                <p>
                    Upload a photo and see what it looks like as dice art.
                </p>
                <Link href="/editor" className="btn-primary">
                    Try the editor
                </Link>
            </div>
        </>
    )
}
