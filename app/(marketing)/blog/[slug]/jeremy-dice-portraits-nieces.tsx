import Link from 'next/link'

export default function JeremyDicePortraits() {
    return (
        <>
            <p className="blog-lead">
                Jeremy Klammer wanted to make something special for his nieces' birthdays. In 2023, he created
                dice portraits — their faces made out of actual dice, then painted to match their personalities.
            </p>

            <div className="blog-note">
                <strong>Note:</strong> Jeremy used an early version of Diceify that was built during COVID.
                The interface looks different now, but the core idea is the same.
            </div>

            <h2>The idea</h2>
            <p>
                Jeremy makes custom gifts for his nieces every year. For K's 5th birthday and C's 8th birthday,
                he decided dice portraits would be memorable and unique.
            </p>
            <p>
                Each finished piece measures 35 × 47 inches — larger than originally planned,
                but the bigger size made the portraits really stand out.
            </p>

            <h2>The process</h2>

            <h3>Finding the right photo</h3>
            <p>
                Jeremy tested 20-30 photos of each girl in Diceify before finding the ones that worked best.
                Clear, straight-on shots produced the best results. Side angles and busy backgrounds
                didn't translate as well to the dice pattern.
            </p>
            <p>
                Once he found the right photos, he adjusted the cropping and zoom until the dice pattern
                looked right, then saved it as a template for the physical build.
            </p>

            <h3>Building the frame</h3>
            <p>
                For the physical construction, Jeremy:
            </p>
            <ul>
                <li>Made a plywood base backed with 2×4s to prevent warping</li>
                <li>Used frames sized 26×32 inches to fit a 35×47 dice grid</li>
                <li>Laid out all the dice on a flat surface first, matching the Diceify template</li>
                <li>Transferred them row by row to the frame with Liquid Nails</li>
                <li>Painted the backgrounds after everything was glued down</li>
            </ul>

            <h2>Personal touches</h2>
            <p>
                Each portrait was customized to reflect the personality of each girl.
            </p>

            <h3>K's portrait</h3>
            <ul>
                <li>Her favorite colors: pink, purple, and turquoise</li>
                <li>A yellow school bus in the background — she had just started riding the bus that year</li>
            </ul>

            <h3>C's portrait</h3>
            <ul>
                <li>Sunset colors: red, orange, and yellow</li>
                <li>Pink bubble pattern in the background — she'd just learned to blow bubble gum bubbles</li>
            </ul>

            <h2>The fingerprint tradition</h2>
            <p>
                One special touch: at each birthday party, all the guests put their fingerprints on the artwork.
                Parents, grandparents, cousins, friends — whoever attended. It's a tradition Jeremy started
                at his oldest niece's first birthday, turning each piece into a memory of who was there.
            </p>

            <h2>Time investment</h2>
            <p>
                Each piece took over 100 hours to complete. Jeremy notes that now that he knows the process,
                future pieces would go faster. His tips for anyone trying this:
            </p>
            <ul>
                <li>Test lots of photos before committing to one</li>
                <li>Straight-on, well-lit shots work best</li>
                <li>Lay everything out before gluing</li>
                <li>Add something personal to make the gift meaningful</li>
            </ul>

            <div className="blog-cta">
                <h3>Want to try it yourself?</h3>
                <p>
                    Use Diceify to generate the dice pattern, then build it however you like.
                </p>
                <Link href="/editor" className="btn-primary">
                    Open the editor
                </Link>
            </div>

            <hr className="blog-divider" />

            <div className="blog-source">
                <p>
                    <strong>Source:</strong> This article is based on Jeremy Klammer's original blog post.
                    See more photos and details on his website:
                </p>
                <a
                    href="https://jeremyklammer.com/2023/11/21/dice-art/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="blog-source-link"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Dice Portraits – Klammer Lab
                </a>
            </div>
        </>
    )
}
