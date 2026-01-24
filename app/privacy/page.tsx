import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'Privacy Policy for Diceify - Learn how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
    return (
        <>
            {/* Background Elements */}
            <div className="bg-gradient">
                <div className="orb one"></div>
                <div className="orb two"></div>
                <div className="orb three"></div>
            </div>
            <div className="grid-overlay"></div>

            {/* Content */}
            <div className="content relative z-[2] max-w-[900px] mx-auto w-full px-6 py-12">
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
                        Last updated: January 23, 2025
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
                                Your images are processed client-side in your browser. We store project data to enable you to save and continue your work across sessions.
                            </p>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                                2.3 Payment Information
                            </h3>
                            <p>
                                If you purchase Pro access, payment processing is handled securely by Stripe. We do not store your credit card details. We only store a Stripe customer ID to manage your purchase status.
                            </p>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                                2.4 Analytics Data
                            </h3>
                            <p>
                                We use Google Analytics and Vercel Analytics to understand how users interact with our Service. This includes information such as pages visited, time spent on pages, and general usage patterns. This data is anonymized and used to improve our Service.
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
                                Your data is stored securely using industry-standard practices. We use PostgreSQL databases hosted on secure cloud infrastructure. All data transmission is encrypted using HTTPS. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
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
                                <li><strong>Service Providers:</strong> Third-party services that help us operate our Service (e.g., Stripe for payments, cloud hosting providers)</li>
                                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                6. Data Retention
                            </h2>
                            <p>
                                We retain your account data and projects for as long as your account is active. If you delete your account, we will delete your personal data and projects within 30 days, except where we are required to retain certain information for legal or legitimate business purposes.
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
                                We use essential cookies to maintain your session and preferences. Analytics services may use their own cookies to collect anonymized usage data. You can control cookie settings through your browser preferences.
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
