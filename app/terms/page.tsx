import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Terms of Service for Diceify - The rules and guidelines for using our dice mosaic art generator.',
}

export default function TermsPage() {
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
                        Terms of Service
                    </h1>
                    <p className="text-[var(--text-dim)] mb-8">
                        Last updated: January 23, 2025
                    </p>

                    <div className="space-y-8 text-[var(--text-secondary)]">
                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                1. Acceptance of Terms
                            </h2>
                            <p>
                                By accessing or using Diceify at diceify.art (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service. We reserve the right to modify these Terms at any time, and your continued use of the Service constitutes acceptance of any changes.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                2. Description of Service
                            </h2>
                            <p>
                                Diceify is a web-based tool that transforms digital photos into dice mosaic art patterns. The Service allows users to upload images, customize dice configurations, generate building blueprints, and export their creations. We offer both free and paid (Pro) tiers with different feature sets.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                3. User Accounts
                            </h2>
                            <p className="mb-3">
                                To access certain features, you must create an account using Google Sign-In. You agree to:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Provide accurate and complete information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Promptly notify us of any unauthorized access</li>
                                <li>Accept responsibility for all activities under your account</li>
                            </ul>
                            <p className="mt-3">
                                We reserve the right to suspend or terminate accounts that violate these Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                4. Free and Pro Services
                            </h2>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                                4.1 Free Tier
                            </h3>
                            <p>
                                Free users have access to basic features with certain limitations, such as the number of projects they can save and access to advanced customization options.
                            </p>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                                4.2 Pro (Lifetime Access)
                            </h3>
                            <p>
                                Pro is available as a one-time purchase that grants lifetime access to all Pro features for as long as the Service remains operational. This is not a subscription—there are no recurring charges. Once you purchase Pro, you retain access to Pro features indefinitely while the Service is available.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                5. Payments and Refunds
                            </h2>
                            <p className="mb-3">
                                All payments are processed securely through Stripe. By purchasing Pro access, you agree to:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Pay the one-time fee as displayed at the time of purchase</li>
                                <li>Provide valid payment information</li>
                            </ul>
                            <p className="mt-3">
                                Since Pro is a one-time purchase (not a subscription), there are no recurring charges. Refunds may be provided at our discretion within 7 days of purchase if you have not substantially used Pro features. To request a refund, contact us at support@diceify.art.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                6. Service Availability and Discontinuation
                            </h2>
                            <p className="mb-3">
                                While we intend to operate Diceify indefinitely, we cannot guarantee perpetual availability. Your lifetime Pro access is valid for as long as the Service remains operational.
                            </p>
                            <p className="mb-3">
                                In the event that we decide to discontinue the Service:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>We will provide at least 30 days advance notice via email to all registered users</li>
                                <li>During this notice period, you will have full access to export your projects and data</li>
                                <li>We will make reasonable efforts to provide users with their project data before shutdown</li>
                            </ul>
                            <p className="mt-3">
                                Service discontinuation does not entitle users to refunds for Pro purchases, as the purchase grants access for the lifetime of the Service, not in perpetuity.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                7. User Content
                            </h2>
                            <p className="mb-3">
                                You retain ownership of all images and content you upload to the Service ("User Content"). By uploading User Content, you grant us a limited license to process and store your content solely for the purpose of providing the Service.
                            </p>
                            <p>You represent and warrant that:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                                <li>You own or have the right to use all User Content you upload</li>
                                <li>Your User Content does not infringe any third-party rights</li>
                                <li>Your User Content does not contain illegal, harmful, or offensive material</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                8. Acceptable Use
                            </h2>
                            <p className="mb-3">You agree not to:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Use the Service for any illegal purpose</li>
                                <li>Upload content that is harmful, offensive, or infringes on others' rights</li>
                                <li>Attempt to gain unauthorized access to our systems</li>
                                <li>Interfere with or disrupt the Service</li>
                                <li>Use automated tools to access the Service without permission</li>
                                <li>Resell or redistribute the Service without authorization</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                9. Intellectual Property
                            </h2>
                            <p>
                                The Service, including its design, features, and content (excluding User Content), is owned by Diceify and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works from any part of the Service without our written permission.
                            </p>
                            <p className="mt-3">
                                The dice mosaic patterns you create using the Service are yours to use for personal or commercial purposes, subject to any copyright restrictions on the original images you upload.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                10. Disclaimer of Warranties
                            </h2>
                            <p>
                                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. YOU USE THE SERVICE AT YOUR OWN RISK.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                11. Limitation of Liability
                            </h2>
                            <p>
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DICEIFY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                12. Indemnification
                            </h2>
                            <p>
                                You agree to indemnify and hold harmless Diceify, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorney fees) arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                13. Termination
                            </h2>
                            <p>
                                You may terminate your account at any time by contacting us. We may suspend or terminate your access to the Service at any time for any reason, including violation of these Terms. Upon termination, your right to use the Service ceases immediately, and we may delete your account data in accordance with our Privacy Policy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                14. Governing Law
                            </h2>
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved in the courts of competent jurisdiction.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                15. Contact Us
                            </h2>
                            <p>
                                If you have any questions about these Terms, please contact us at:
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
