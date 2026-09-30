// Open the Stripe customer portal for subscription management,
// shared by the desktop user menu and the mobile menu
export async function openBillingPortal() {
    try {
        const response = await fetch('/api/stripe/portal', { method: 'POST' })
        const data = await response.json()
        if (data.url) {
            window.location.href = data.url
        }
    } catch (error) {
        console.error('Failed to open billing portal:', error)
    }
}
