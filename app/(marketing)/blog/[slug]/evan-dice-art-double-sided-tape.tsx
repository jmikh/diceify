import Image from 'next/image'
import Link from 'next/link'

const linkClass = 'text-[var(--pink)] hover:underline'
const externalLink = { target: '_blank', rel: 'nofollow noopener noreferrer', className: linkClass }

const DICE_URL = 'https://share.temu.com/yYl90k02eGA'
const TAPE_URL = 'https://share.temu.com/HdBHIZOrCuA'

export default function EvanDiceArtDoubleSidedTape() {
    return (
        <>
            <p className="blog-lead">
                It&apos;s difficult to find any information online about how to create a dice art piece. Here&apos;s
                how I made mine: no pane of glass, no epoxy, just dice you can actually feel.
            </p>

            <figure className="my-8">
                <Image
                    src="/images/blog/evan-dice-art-finished.webp"
                    alt="Evan Morgan's finished black and white dice art of the Home Alone scream, framed"
                    width={960}
                    height={1280}
                    sizes="(max-width: 767px) 100vw, 480px"
                    className="w-full max-w-[480px] mx-auto h-auto rounded-xl"
                />
                <figcaption>
                    The finished piece: black and white 8 mm dice on double-sided tape, on a Masonite board.
                </figcaption>
            </figure>

            <h2>The build at a glance</h2>
            <ul>
                <li><strong>Time:</strong> 30-40 hours over about 2 weeks, at a minimum of 5 rows per day</li>
                <li><strong>Board:</strong> Masonite, cut by a local framing company</li>
                <li><strong>Dice:</strong> 8 mm black and white dice from Temu, around $225 CAD</li>
                <li><strong>Adhesive:</strong> 4&quot; commercial-grade double-sided tape</li>
            </ul>

            <h2>The pattern</h2>
            <p>
                I found Diceify through Google while researching dice art resources. I especially liked how it
                allowed customizing the contrast, brightness, sharpness, and the makeup and direction of the dice.
            </p>

            <h2>No glass, no epoxy</h2>
            <p>
                I wanted to make sure that people could actually feel the dice art, and not have it covered in a
                pane of glass or an epoxy. Glue felt like the best solution, but that sounded messy if I applied
                too much.
            </p>

            <h2>The board</h2>
            <p>
                I contacted a local framing company and asked them to cut a piece of Masonite board for me. This is
                a simple material that was perfect for the dice art.
            </p>
            <p>
                I simply multiplied the 8 mm dice by the dimensions of the art piece. I had the number of dice for
                the height (from Diceify), and did simple math to find the width. Each die was technically less
                than 8 mm, so I had a bit of a gap overhang. The framing company ended up trimming this excess when
                I brought the dice back.
            </p>

            <h2>The dice</h2>
            <p>
                I sourced the dice from Temu and purchased them using coupon codes. They come in black and white:{' '}
                <a href={DICE_URL} {...externalLink}>the dice I bought</a>.
            </p>
            <p>
                I ended up spending around $225 CAD for 12 × 601 pcs (white) and 8 × 601 pcs (black). I think the
                dice price has increased since then.
            </p>

            <h2>The adhesive: double-sided tape</h2>
            <p>
                I previously thought glue or epoxy, but these sounded messy or didn&apos;t allow people to physically
                touch the art and feel the dice. I ended up using a commercial-grade double-sided tape, also found
                on Temu: <a href={TAPE_URL} {...externalLink}>the tape I used</a>.
            </p>
            <p>
                I bought the 4&quot; wide one and I have a ton left over. It was super easy to align onto the board
                (compared to using a regular double-sided tape). There is also a 6&quot; one, but it was too
                expensive for my purposes.
            </p>
            <p>
                The adhesion was <strong>really</strong> good (I inadvertently waxed some arm hair in the process).
            </p>

            <figure className="my-8">
                <Image
                    src="/images/blog/evan-dice-art-in-progress.webp"
                    alt="A dice art build in progress: rows of dice on double-sided tape on a Masonite board, with a hammer and loose black and white dice"
                    width={720}
                    height={1280}
                    sizes="(max-width: 767px) 100vw, 360px"
                    className="w-full max-w-[360px] mx-auto h-auto rounded-xl"
                />
                <figcaption>
                    How I laid things out: the tape exposed a little at a time, the next dice ready and the hammer
                    close by.
                </figcaption>
            </figure>

            <h2>Technique</h2>
            <p>
                I exposed the double-sided tape in small increments as I worked up each row.
            </p>
            <p>
                Every few rows, I would lightly hammer the top and run a hammer along the row to keep it level.
                I&apos;ve seen some dice art videos where the rows start to become uneven, which I didn&apos;t want.
                A small misaligned die early on has a ripple effect as you continue.
            </p>

            <h2>How long it took</h2>
            <p>
                I worked on it for probably 30-40 hours, and it took me about 2 weeks to complete. I had a goal to
                complete a minimum of 5 rows per day, which made things easy with Diceify.
            </p>

            <div className="blog-cta">
                <h3>Want to try it yourself?</h3>
                <p>
                    Make the pattern with the free <Link href="/" className={linkClass}>dice art generator</Link>.
                    For other ways to build it, see{' '}
                    <Link href="/dice-art/buying-dice" className={linkClass}>buying dice</Link> and{' '}
                    <Link href="/dice-art/how-to-glue-dice-art" className={linkClass}>how to glue dice art</Link>.
                </p>
                <Link href="/editor" className="btn-primary">
                    Open the editor
                </Link>
            </div>
        </>
    )
}
