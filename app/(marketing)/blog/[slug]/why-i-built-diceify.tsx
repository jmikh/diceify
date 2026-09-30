import Link from 'next/link'

export default function WhyIBuiltDiceify() {
    return (
        <>
            <p className="blog-lead">
                It started during COVID. I wanted to make a dice portrait of Um Kulthum — the most famous
                Egyptian singer of all time. But when I looked for tools to help, everything I found was... frustrating.
            </p>

            <h2>The problem with existing tools</h2>
            <p>
                None of the tools out there gave you real control. No sharpness adjustment. No proper black and
                white option. Just basic converters that spit out a pattern and left you to figure out the rest.
            </p>
            <p>
                But even when you had a decent pattern, actually building the thing was a nightmare.
            </p>

            <h2>Losing track of everything</h2>
            <p>
                Here's what would happen: you're staring at an image of your dice pattern, trying to place dice
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
                That's when I thought: what if there was a follow-along interface? Something that shows you exactly
                where you are. One die at a time. No guessing, no recounting, no losing your place.
            </p>
            <p>
                That's the Builder. It highlights the current position, tells you which die to place, and tracks
                your progress. You just follow along. It makes the whole process so much easier.
            </p>

            <h2>Two ways to build</h2>
            <p>
                I've found there are two main approaches to physically building dice art:
            </p>
            <ul>
                <li><strong>Glue first, then dice:</strong> Apply glue to the base, then place each die onto the adhesive. More controlled but slower.</li>
                <li><strong>Dice first, then glue on top:</strong> Arrange all the dice dry, then apply glue or resin over the top. Much faster, but risky.</li>
            </ul>
            <p>
                I tried the second method. It's tempting because it's so much quicker. But here's the catch: if
                your top layer isn't transparent enough, or if it forms bubbles, it can mess up your entire piece.
            </p>
            <p>
                That's exactly what happened to me. So if you go that route, keep a close eye on your adhesive.
                Test it first on a small area.
            </p>

            <h2>I'd love to hear about your process</h2>
            <p>
                Everyone builds differently. Some people have figured out tricks I've never thought of. If you've
                made dice art — or you're planning to — I'd genuinely love to hear how you approached it.
            </p>
            <p>
                What worked? What didn't? What would you do differently next time?
            </p>

            <h2>Watch the full process</h2>
            <p>
                Here's a video of me building the Um Kulthum portrait from start to finish:
            </p>
            <div className="blog-video">
                <iframe
                    src="https://www.youtube.com/embed/z4UUXeYqJZw"
                    title="Building a Dice Portrait with Diceify"
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
