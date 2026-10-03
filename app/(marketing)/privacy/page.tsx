import { Metadata } from 'next'
import Link from 'next/link'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
    title: 'Privacy Policy',
    description: 'Privacy Policy for Diceify - Learn how we collect, use, and protect your data.',
    path: '/privacy',
})

export default function PrivacyPage() {
    return (
        <>
            {/* Content */}
            <div className="relative z-[2] max-w-[900px] mx-auto w-full px-6 py-12">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-[var(--text-dim)] hover:text-[var(--pink)] transition-colors mb-8"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Home
                </Link>

                <div className="frosted-glass rounded-2xl p-8 md:p-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">
                        Privacy Policy
                    </h1>
                    <p className="text-[var(--text-dim)] mb-8">
                        Last updated: October 3, 2026
                    </p>

                    <div className="space-y-8 text-[var(--text-secondary)]">
                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                1. Introduction
                            </h2>
                            <p>
                                Welcome to Diceify ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our dice mosaic art generator service at diceify.art (the "Service").
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                2. Information We Collect
                            </h2>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                                2.1 Information from Google Sign-In
                            </h3>
                            <p className="mb-3">
                                When you sign in with Google, we receive and store the following information from your Google account:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Your email address</li>
                                <li>Your name</li>
                                <li>Your profile picture</li>
                            </ul>
                            <p className="mt-3">
                                We use this information to create and manage your account, personalize your experience, and communicate with you about your account.
                            </p>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                                2.2 Project Data
                            </h3>
                            <p className="mb-3">
                                When you create dice mosaic projects, we store:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Images you upload for conversion</li>
                                <li>Project settings (grid size, color mode, contrast, etc.)</li>
                                <li>Crop and rotation parameters</li>
                                <li>Build progress data</li>
                            </ul>
                            <p className="mt-3">
                                Your images are converted into dice patterns in your browser. Project data is stored only when you are signed in: it is saved to your account (database and file storage provided by Supabase) so you can continue your work across devices.
                            </p>
                            <p className="mt-3">
                                <strong>Without an account:</strong> if you use the editor without signing in, your draft stays in your browser. The project settings are kept in your browser's local storage and the photo in its IndexedDB database. Nothing is uploaded to us until you sign in and save the project to your account.
                            </p>
                            <p className="mt-3">
                                <strong>Share links:</strong> when you create a share link, the dice-pattern card for that share is public to anyone who has the link. It contains the dice pattern, not your original photo.
                            </p>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                                2.3 Payment Information
                            </h3>
                            <p>
                                If you purchase a subscription or a Creator Pass, payment processing is handled securely by Stripe. We do not store your credit card details. We store a Stripe customer ID and the status and dates of your purchase or subscription to manage your access.
                            </p>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                                2.4 Analytics and Error Reporting
                            </h3>
                            <p className="mb-3">
                                We use the following services to understand how people use Diceify and to find bugs:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li><strong>Google Analytics 4:</strong> pages visited, the steps of the editor you use, and general usage patterns.</li>
                                <li><strong>PostHog:</strong> product analytics (the same kind of events) and session replay, which records clicks, scrolling and page changes for some visits. Photos you upload and the dice previews generated from them are masked and never appear in a recording.</li>
                                <li><strong>Cloudflare:</strong> hosts the site and serves it through its network; its Web Analytics beacon measures page loads.</li>
                                <li><strong>Sentry:</strong> receives error reports from your browser when something in the Service fails.</li>
                            </ul>
                            <p className="mt-3">
                                When you are signed in, analytics events and error reports are linked to your account ID (not your name or email) so that we can understand and fix problems for a specific account. Visitors who are not signed in are not identified.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                3. How We Use Your Information
                            </h2>
                            <p className="mb-3">We use the information we collect to:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Provide, operate, and maintain our Service</li>
                                <li>Create and manage your user account</li>
                                <li>Save and sync your projects across devices</li>
                                <li>Process payments</li>
                                <li>Send you service-related communications</li>
                                <li>Improve and optimize our Service</li>
                                <li>Detect and prevent fraud or abuse</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                4. Data Storage and Security
                            </h2>
                            <p>
                                Your account, projects and uploaded images are stored by Supabase (authentication, a PostgreSQL database and file storage), with access rules that restrict each user's data to that user. The website itself is served by Cloudflare. All data transmission is encrypted using HTTPS. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                5. Data Sharing
                            </h2>
                            <p className="mb-3">
                                We do not sell your personal data. We may share your information with:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li><strong>Service Providers:</strong> Third-party services that process data on our behalf to operate the Service: Supabase (authentication, database and file storage for saved projects), Stripe (payments), Cloudflare (hosting, content delivery and web analytics), Google Analytics 4 and PostHog (analytics and session replay), and Sentry (error reporting)</li>
                                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                6. Data Retention
                            </h2>
                            <p>
                                We retain your account data and projects for as long as your account exists. You can delete your account at any time from your account page: this immediately deletes your profile, projects, uploaded images and share cards from our systems and cancels any active subscription. Payment records are kept by Stripe as required for accounting and legal purposes, and analytics and error data are retained by the services listed in Section 2.4 according to their own retention settings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                7. Your Rights
                            </h2>
                            <p className="mb-3">You have the right to:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Access the personal data we hold about you</li>
                                <li>Request correction of inaccurate data</li>
                                <li>Request deletion of your data</li>
                                <li>Export your project data</li>
                                <li>Withdraw consent for data processing</li>
                            </ul>
                            <p className="mt-3">
                                To exercise these rights, please contact us at the email address below.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                8. Cookies
                            </h2>
                            <p>
                                We use your browser's local storage to maintain your sign-in session and, for anonymous visitors, your draft. The analytics services in Section 2.4 set their own cookies or local storage to recognize returning visitors. You can control cookies and site data through your browser preferences.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                9. Children's Privacy
                            </h2>
                            <p>
                                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal data from children under 13. If you believe we have collected data from a child under 13, please contact us immediately.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                10. Changes to This Policy
                            </h2>
                            <p>
                                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                11. Contact Us
                            </h2>
                            <p>
                                If you have any questions about this Privacy Policy or our data practices, please contact us at:
                            </p>
                            <p className="mt-2">
                                <strong>Email:</strong>{' '}
                                <a
                                    href="mailto:support@diceify.art"
                                    className="text-[var(--pink)] hover:underline"
                                >
                                    support@diceify.art
                                </a>
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </>
    )
}
