// Plan catalogue: limits and display/pricing metadata. Projects are unlimited on every plan (G1).

export type Plan = 'explorer' | 'creator' | 'studio' | 'lifetime'

export const PLANS: readonly Plan[] = ['explorer', 'creator', 'studio', 'lifetime']

export interface PlanLimits {
  /** Rows a user may build; `null` = unlimited (never `Infinity`: it does not survive JSON). */
  builderRowLimit: number | null
  hasSvgExport: boolean
  /** Black and white dice in one design (colour mode `both`). */
  hasMixedDice: boolean
  /** Rows a design may have and still be built; `null` = unlimited. Larger designs can only be previewed. */
  designRowLimit: number | null
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  explorer: { builderRowLimit: 5, hasSvgExport: false, hasMixedDice: false, designRowLimit: null },
  creator: { builderRowLimit: null, hasSvgExport: true, hasMixedDice: true, designRowLimit: null },
  studio: { builderRowLimit: null, hasSvgExport: true, hasMixedDice: true, designRowLimit: null },
  lifetime: { builderRowLimit: null, hasSvgExport: true, hasMixedDice: true, designRowLimit: null },
}

/** What a user can buy (the `plan` sent to the billing checkout route). */
export const CHECKOUT_PLANS = ['creator', 'studio_monthly', 'studio_yearly'] as const
export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number]

export const isCheckoutPlan = (value: unknown): value is CheckoutPlan =>
  (CHECKOUT_PLANS as readonly unknown[]).includes(value)

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
  },
} as const

export const STUDIO_YEARLY_MONTHLY_EFFECTIVE = PRICING.studio.yearlyPrice / 12
export const STUDIO_YEARLY_SAVINGS_PERCENT = Math.round(
  (1 - PRICING.studio.yearlyPrice / (PRICING.studio.monthlyPrice * 12)) * 100,
)
