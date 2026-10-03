'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DICE_PARAM_BOUNDS } from '@/core/dice'
import { PLAN_LIMITS, PRICING } from '@/core/billing'
import JsonLd from '@/components/JsonLd'

interface Faq {
    question: string
    /** Plain text: shown on the page and reused verbatim in the FAQPage structured data. */
    answer: string
}

const { min: MIN_ROWS, max: MAX_ROWS } = DICE_PARAM_BOUNDS.numRows
const FREE_ROWS = PLAN_LIMITS.explorer.builderRowLimit

// Product questions only; what dice art is, dice counts and build times live on /dice-art.
const FAQS: Faq[] = [
    {
        question: 'Is Diceify free?',
        answer: `Yes. The Explorer plan is free and needs no sign-up to try: upload a photo, tune the pattern and preview it. The free builder covers the first ${FREE_ROWS} rows; the Creator Pass ($${PRICING.creator.price} one-time, ${PRICING.creator.accessDays} days) or Studio ($${PRICING.studio.monthlyPrice}/month or $${PRICING.studio.yearlyPrice}/year) unlock the full builder and SVG blueprints.`,
    },
    {
        question: 'Can I print or export the pattern?',
        answer: 'On the free plan you get the full live preview and the exact black and white dice counts in the editor, and after signing in (free) you can share a link that shows your pattern on a social card. The Creator Pass and Studio add the full-resolution SVG blueprint download, which you can print at any size. There is no PDF export and no free image file download today.',
    },
    {
        question: 'Does it work on my phone?',
        answer: 'Yes. Diceify runs in the browser on phones, tablets and desktops with no app to install, and the editor has a mobile layout. The builder is designed to sit next to your frame while you place dice.',
    },
    {
        question: 'Is my photo uploaded?',
        answer: 'The dice pattern is generated in your browser. If you are not signed in, your draft stays on your device. A photo is uploaded to your private project only when you sign in and save it, so you can reopen it on another device.',
    },
    {
        question: `What do I get with the Creator Pass ($${PRICING.creator.price})?`,
        answer: `${PRICING.creator.accessDays} days of full access for a one-time $${PRICING.creator.price}: the builder for every row of your grid, full-resolution SVG blueprints and unlimited saved projects. It does not renew; Studio is the subscription for ongoing work.`,
    },
    {
        question: 'How big a piece can I build?',
        answer: `Any grid from ${MIN_ROWS} to ${MAX_ROWS} rows tall; the width follows your crop. Diceify shows the exact number of black and white dice for the size you pick.`,
    },
    {
        question: 'Is Diceify the same as Dicify?',
        answer: 'No. Diceify (with an e) is the dice art generator at diceify.art; Dicify is an unrelated TensorFlow.js book project.',
    },
]

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
}

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <section className="faq-section" id="faq">
            <JsonLd data={faqJsonLd} />
            <div className="section-header">
                <span className="section-label">FAQ</span>
                <h2>Frequently asked questions</h2>
            </div>
            <div className="faq-list">
                {FAQS.map((faq, i) => {
                    const open = openIndex === i
                    const answerId = `faq-answer-${i}`
                    return (
                        // Heading-wraps-button so extractors see the question as an <h3>; answers stay in the DOM.
                        <div key={faq.question} className={`faq-item ${open ? 'open' : ''}`}>
                            <h3 className="m-0">
                                <button
                                    type="button"
                                    className="faq-question w-full bg-transparent border-0 p-0 text-left cursor-pointer"
                                    onClick={() => setOpenIndex(open ? null : i)}
                                    aria-expanded={open}
                                    aria-controls={answerId}
                                >
                                    <span>{faq.question}</span>
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden="true"
                                        className={`faq-chevron ${open ? 'rotated' : ''}`}
                                    >
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </button>
                            </h3>
                            {/* The stylesheet caps an open answer at 300px; the longer product answers need more on narrow screens. */}
                            <div className="faq-answer" id={answerId} style={open ? { maxHeight: 600 } : undefined}>
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
            <p className="mt-8 text-center text-[var(--text-muted)]">
                For how dice art works, dice counts and build times, see the{' '}
                <Link href="/dice-art" className="text-[var(--pink)] hover:underline">dice art guide</Link>.
            </p>
        </section>
    )
}
