'use client'

import { useState } from 'react'
import Link from 'next/link'

const faqs = [
    {
        question: 'What is dice art?',
        answer: (
            <>
                Dice art is a form of mosaic art where standard six-sided dice are arranged in a grid to recreate an image.
                Each die face (1 dot through 6 dots) acts as a different shade of gray. When hundreds or thousands of dice
                are placed together, the individual faces blend into a cohesive image, much like pixels on a screen.
            </>
        ),
    },
    {
        question: 'How many dice do I need?',
        answer: (
            <>
                It depends on the size and detail of your design. A small dice portrait might use 400 to 900 dice
                (20×20 to 30×30 grid), a medium project around 1,600 to 2,500 dice (40×40 to 50×50), and large-scale
                pieces can use 5,000 or more. Diceify automatically calculates the exact count based on your chosen dimensions.
            </>
        ),
    },
    {
        question: 'Should I use black dice, white dice, or both?',
        answer: (
            <>
                For the best results, use <strong>both black and white dice</strong>. This gives you 12 brightness levels
                instead of 6, producing much clearer images with smoother shading. Black dice alone still work and some
                people prefer the look, but the detail is noticeably reduced. White dice alone don't produce recognizable
                images because there isn't enough contrast range.
            </>
        ),
    },
    {
        question: 'Do I need a high-quality photo?',
        answer: (
            <>
                No. Dice art generators downscale your image by aggregating groups of pixels into single brightness values,
                so a low-resolution or even slightly blurry photo works fine. What matters more is the composition. Zoom in
                on a face and make sure there's good contrast between the subject and the background.
            </>
        ),
    },
    {
        question: 'How long does it take to build?',
        answer: (
            <>
                A small 20×20 portrait (400 dice) might take 2 to 4 hours. A medium 40×40 piece (1,600 dice) can take a
                full day or two. Using{' '}
                <Link href="/editor" className="text-[var(--pink)] hover:underline">Diceify's builder</Link>{' '}
                speeds things up significantly because it zooms in on your current position, tells you how many continuous
                dice of the same value to place, and tracks your overall progress.
            </>
        ),
    },
    {
        question: "What's the difference between dice art and pixel art?",
        answer: (
            <>
                Both are grid-based, but they use different elements. Pixel art uses colored squares, giving you unlimited
                colors. Dice art uses six-sided dice, giving you up to 12 shades (with black and white dice) and adding a
                three-dimensional, tactile quality that you can't get with flat media.
            </>
        ),
    },
]

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <section className="faq-section" id="faq">
            <div className="section-header">
                <span className="section-label">FAQ</span>
                <h2>Frequently asked questions</h2>
            </div>
            <div className="faq-list">
                {faqs.map((faq, i) => (
                    <button
                        key={i}
                        className={`faq-item ${openIndex === i ? 'open' : ''}`}
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        aria-expanded={openIndex === i}
                    >
                        <div className="faq-question">
                            <span>{faq.question}</span>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`faq-chevron ${openIndex === i ? 'rotated' : ''}`}
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </div>
                        <div className="faq-answer">
                            <p>{faq.answer}</p>
                        </div>
                    </button>
                ))}
            </div>
            <div className="flex justify-center mt-8">
                <Link href="/dice-art" className="btn-secondary">
                    Learn more about dice art
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </section>
    )
}
