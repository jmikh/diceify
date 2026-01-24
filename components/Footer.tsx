'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer id="about" className="relative z-10 py-6 px-6 md:px-24 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-[var(--border-glass)]">
      <p className="text-[var(--text-dim)] text-sm">&copy; 2025 Diceify. Made for makers.</p>

      <div className="flex items-center gap-6">
        <ul className="flex gap-4 list-none">
          <li>
            <Link
              href="/privacy"
              className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors"
            >
              Privacy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors"
            >
              Terms
            </Link>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/john-mikhail/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors"
            >
              LinkedIn
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}