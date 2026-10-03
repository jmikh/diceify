import Link from 'next/link'
import { FaInstagram } from 'react-icons/fa'
import { ImReddit } from 'react-icons/im'
import { RiTiktokLine } from 'react-icons/ri'
import { currentYear, DEFINITION, SOCIAL_URLS, SUPPORT_EMAIL } from '@/lib/schema'

const linkClass = 'text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors'
const headingClass = 'text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-1'

interface FooterLink {
  href: string
  label: string
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { href: '/editor', label: 'Editor' },
      { href: '/gallery', label: 'Gallery' },
      { href: '/#pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { href: '/dice-art', label: 'Dice Art Guide' },
      { href: '/dice-art/size-calculator', label: 'Size Calculator' },
      { href: '/dice-art/buying-dice', label: 'Buying Dice' },
      { href: '/dice-art/how-to-glue-dice-art', label: 'How to Glue Dice Art' },
      { href: '/dice-art/best-photos', label: 'Best Photos for Dice Art' },
      { href: '/best-dice-art-generators', label: 'Best Dice Art Generators' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
]

const SOCIALS = [
  { href: SOCIAL_URLS.tiktok, label: 'Diceify on TikTok', Icon: RiTiktokLine },
  { href: SOCIAL_URLS.instagram, label: 'Diceify on Instagram', Icon: FaInstagram },
  { href: SOCIAL_URLS.reddit, label: 'r/DicePortraits on Reddit', Icon: ImReddit },
]

// The definition sentence with "dice art generator" linked to the homepage (the page that should rank for it).
const [definitionBefore, definitionAfter] = DEFINITION.split('dice art generator')

export default function Footer() {
  return (
    <footer className="relative z-10 py-10 px-6 md:px-24 border-t border-[var(--border-glass)]">
      <div className="flex flex-col md:flex-row justify-between gap-10">
        {/* Brand + Socials */}
        <div className="flex flex-col gap-3">
          <p className="text-[var(--text-primary)] text-sm font-semibold">Diceify</p>
          <p className="text-[var(--text-dim)] text-sm max-w-[320px]">
            {definitionBefore}
            <Link href="/" className="text-[var(--text-secondary)] no-underline hover:text-[var(--pink)] transition-colors">
              dice art generator
            </Link>
            {definitionAfter}
          </p>
          <div className="flex gap-4 mt-1">
            {SOCIALS.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-dim)] text-lg no-underline hover:text-[var(--pink)] transition-colors"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        {/* Link Columns */}
        <div className="flex gap-12 md:gap-16 flex-wrap">
          {COLUMNS.map(({ title, links }) => (
            <div key={title} className="flex flex-col gap-2">
              <p className={headingClass}>{title}</p>
              {links.map(({ href, label }) => (
                // The editor is a heavy client bundle: never prefetch it from a marketing page.
                <Link key={href} href={href} prefetch={href === '/editor' ? false : undefined} className={linkClass}>
                  {label}
                </Link>
              ))}
              {title === 'Legal' && (
                <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                  Contact
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--border-glass)]">
        <p className="text-[var(--text-dim)] text-xs text-center">&copy; {currentYear()} Diceify. Made for makers.</p>
      </div>
    </footer>
  )
}
