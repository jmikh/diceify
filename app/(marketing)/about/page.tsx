import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { DICE_PARAM_BOUNDS } from "@/core/dice";
import { PLAN_LIMITS, PRICING } from "@/core/billing";
import {
  ABOUT_URL,
  BUILD_VIDEO_ID,
  FOUNDER_NAME,
  FOUNDER_REF,
  FOUNDER_YOUTUBE_URL,
  FOUNDING_YEAR,
  ORGANIZATION_REF,
  pageGraph,
  SOCIAL_URLS,
  SUPPORT_EMAIL,
  WEBSITE_REF,
  founderNode,
} from "@/lib/schema";
import { pageMetadata, SITE_URL } from "@/lib/seo";

const TITLE = "About Diceify — Who Built the Dice Art Generator";
const DESCRIPTION =
  "Diceify was built by John Mikhail in 2020 after he kept losing his place building an Umm Kulthum dice portrait. How the generator works, what is free, and how to reach us.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/about",
});

const FREE_ROWS = PLAN_LIMITS.explorer.builderRowLimit;
const { min: MIN_ROWS, max: MAX_ROWS } = DICE_PARAM_BOUNDS.numRows;

const jsonLd = pageGraph(
  {
    "@type": "AboutPage",
    "@id": `${ABOUT_URL}#webpage`,
    url: ABOUT_URL,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en",
    isPartOf: WEBSITE_REF,
    about: ORGANIZATION_REF,
    mainEntity: FOUNDER_REF,
  },
  founderNode({
    jobTitle: "Founder",
    description: `Founder of Diceify, the dice art generator, which he started building in ${FOUNDING_YEAR} while making a dice portrait of Umm Kulthum.`,
    knowsAbout: ["dice art", "dice portraits", "dice mosaics"],
  }),
  {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "About", item: ABOUT_URL },
    ],
  },
);

const linkClass = "text-[var(--pink)] hover:underline";

const SOCIAL_LINKS = [
  { href: SOCIAL_URLS.instagram, label: "Instagram (@diceify.art)" },
  { href: SOCIAL_URLS.tiktok, label: "TikTok (@diceify.art)" },
  { href: FOUNDER_YOUTUBE_URL, label: "John's YouTube channel" },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="marketing-page max-w-[800px]">
        <article className="blog-article">
          <header className="mb-8">
            <span className="section-label">
              <span className="w-2 h-2 bg-[var(--pink)] rounded-full"></span>
              About
            </span>
            <h1 className="font-syne text-3xl md:text-5xl font-bold text-[var(--text-primary)] mt-4 leading-tight">
              Who built Diceify, and why
            </h1>
            <p className="text-[var(--text-muted)] mt-4 text-lg leading-relaxed">
              Diceify is a free, browser-based{" "}
              <Link href="/" className={linkClass}>
                dice art generator
              </Link>{" "}
              that turns a photo into a buildable black-and-white dice pattern
              with exact dice counts and a step-by-step builder. It was built by{" "}
              {FOUNDER_NAME}, a dice-art maker, in {FOUNDING_YEAR}.
            </p>
          </header>

          <div className="blog-content frosted-glass rounded-2xl p-8 md:p-12">
            <h2>The founder</h2>
            <p>
              I&apos;m John Mikhail. Diceify started during COVID in{" "}
              {FOUNDING_YEAR}, when I wanted to make a dice portrait of Umm
              Kulthum, the most famous Egyptian singer of all time. The tools I
              found gave me no real control: no sharpness adjustment, no proper
              black-and-white option, just converters that spat out a pattern
              and left the rest to me.
            </p>
            <p>
              Building the piece was the harder part. I would look down to pick
              up a die, look back at the pattern and lose my place: which row,
              which column? A run of ten 5s in a row would turn into &ldquo;was
              that seven or eight?&rdquo; and a recount. I spent more time
              finding my place than placing dice.
            </p>
            <p>
              So I built the Builder: a follow-along interface that highlights
              the current position, tells you which die to place and how many of
              the same value come next, and tracks your progress. The generator
              around it is the result of wanting those controls myself. The full
              story is in{" "}
              <Link href="/blog/why-i-built-diceify" className={linkClass}>
                Why I Built Diceify
              </Link>
              .
            </p>

            <h2>The Umm Kulthum build</h2>
            <figure className="my-8">
              <Image
                src="/images/blog/why-i-built-diceify.webp"
                alt="A hand placing black and white dice on the Umm Kulthum dice portrait, with the Diceify builder open on a phone beside the frame"
                width={1024}
                sizes="(max-width: 767px) 100vw, 750px"
                height={568}
                className="w-full h-auto rounded-xl"
                priority
              />
              <figcaption className="text-sm text-[var(--text-dim)] mt-3">
                Placing dice on the Umm Kulthum portrait with the builder open
                on a phone next to the frame.
              </figcaption>
            </figure>
            <p>
              I arranged the dice dry and then poured the adhesive over the top,
              which is faster than gluing each die but risky: a top layer that
              is not clear enough, or that forms bubbles, can spoil the whole
              piece. It happened to me, so test your adhesive on a small area
              first. The video shows the build from start to finish.
            </p>
            <div className="blog-video">
              <iframe
                src={`https://www.youtube.com/embed/${BUILD_VIDEO_ID}`}
                title="Umm Kulthum in dice: building a dice portrait with Diceify"
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <h2>How the generator works</h2>
            <p>
              Everything runs in your browser. The pipeline is deterministic, so
              the same photo and settings always give the same pattern:
            </p>
            <ol className="mb-5 pl-6 list-decimal space-y-2">
              <li>The cropped photo is converted to grayscale.</li>
              <li>
                It is shrunk to your grid ({MIN_ROWS} to {MAX_ROWS} rows; the
                width follows the crop) by averaging the exact area of pixels
                each die covers, so a low-resolution photo works fine.
              </li>
              <li>
                An optional sharpening pass makes edges, like eyes and
                hairlines, stand out.
              </li>
              <li>
                Gamma brightens or darkens the midtones, and contrast stretches
                the range.
              </li>
              <li>
                Each cell&apos;s brightness is matched to one of 12 shades:
                black dice showing 1 to 6, then white dice showing 6 to 1.
                Black-only and white-only modes use 6 shades.
              </li>
              <li>
                Optionally the 6, 3 and 2 faces are marked for a 90° rotation,
                so their pips line up.
              </li>
            </ol>
            <p>
              The result is a grid with the exact number of black and white
              dice, which the builder then walks you through row by row. The
              engine is open about its math: the{" "}
              <Link href="/dice-art" className={linkClass}>
                dice art guide
              </Link>{" "}
              explains the shades, dice counts and sizes.
            </p>

            <h2>What is free and what is paid</h2>
            <p>
              The <strong>Explorer</strong> plan is free and needs no sign-up to
              try: generate a pattern from any photo, tune it, preview and share
              it, and use the builder for the first {FREE_ROWS} rows. Signed-in
              users can save unlimited projects.
            </p>
            <p>
              The <strong>{PRICING.creator.name} Pass</strong> is a one-time $
              {PRICING.creator.price} for {PRICING.creator.accessDays} days of
              full access: the builder for every row and full-resolution SVG
              blueprints. It does not renew.{" "}
              <strong>{PRICING.studio.name}</strong> is the same access as a
              subscription, ${PRICING.studio.monthlyPrice} a month or $
              {PRICING.studio.yearlyPrice} a year, for people who make several
              pieces. See the{" "}
              <Link href="/#pricing" className={linkClass}>
                pricing
              </Link>
              .
            </p>

            <h2>Your photos</h2>
            <p>
              The dice pattern is generated on your device. If you are not
              signed in, your draft stays in your browser. A photo is uploaded
              to your private project only when you sign in and save it, so you
              can open it on another device. Details are in the{" "}
              <Link href="/privacy" className={linkClass}>
                privacy policy
              </Link>
              .
            </p>

            <h2>Get in touch</h2>
            <p>
              Questions, bugs or a build you want to show off: email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                {SUPPORT_EMAIL}
              </a>
              . Builds from the community are shared on:
            </p>
            <ul>
              {SOCIAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="blog-cta">
              <h3>Try it on a photo</h3>
              <p>
                Upload a photo and see it as a buildable dice pattern. Free, no
                account required.
              </p>
              <Link href="/editor" prefetch={false} className="btn-primary">
                Start creating
              </Link>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
