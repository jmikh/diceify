// Plan catalogue: limits and display/pricing metadata. Values mirror the current site exactly.

export type Plan = 'explorer' | 'creator' | 'studio' | 'lifetime'

export const PLANS: readonly Plan[] = ['explorer', 'creator', 'studio', 'lifetime']

export interface PlanLimits {
  projectLimit: number
  /** Rows a user may build; `null` = unlimited (never `Infinity`: it does not survive JSON). */
  builderRowLimit: number | null
  hasSvgExport: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  explorer: { projectLimit: 1, builderRowLimit: 5, hasSvgExport: false },
  creator: { projectLimit: 1, builderRowLimit: null, hasSvgExport: true },
  studio: { projectLimit: 5, builderRowLimit: null, hasSvgExport: true },
  lifetime: { projectLimit: 5, builderRowLimit: null, hasSvgExport: true },
}

/** What a user can buy (the `plan` sent to the billing checkout route). */
export type CheckoutPlan = 'creator' | 'studio_monthly' | 'studio_yearly'

export const PRICING = {
  creator: {
    name: 'Creator',
    price: 19,
    accessDays: 30,
    description: 'For creators with a vision and a deadline. 30 days of full access to complete your masterpiece.',
  },
  studio: {
    name: 'Studio',
    monthlyPrice: 9,
    yearlyPrice: 36,
    description: 'For artists who want to take their time or create multiple pieces.',
  },
} as const

export const STUDIO_YEARLY_MONTHLY_EFFECTIVE = PRICING.studio.yearlyPrice / 12
export const STUDIO_YEARLY_SAVINGS_PERCENT = Math.round(
  (1 - PRICING.studio.yearlyPrice / (PRICING.studio.monthlyPrice * 12)) * 100,
)
