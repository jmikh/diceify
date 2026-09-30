import { describe, expect, it } from 'vitest'
import { CheckoutBody, PortalBody } from './billing-schemas.ts'

describe('CheckoutBody', () => {
  it('accepts exactly the three checkout plans', () => {
    for (const plan of ['creator', 'studio_monthly', 'studio_yearly']) {
      expect(CheckoutBody.safeParse({ plan }).success).toBe(true)
    }
    expect(CheckoutBody.safeParse({ plan: 'studio' }).success).toBe(false)
    expect(CheckoutBody.safeParse({ plan: 'lifetime' }).success).toBe(false)
    expect(CheckoutBody.safeParse({}).success).toBe(false)
  })
})

describe('PortalBody', () => {
  it('takes an optional same-origin path', () => {
    expect(PortalBody.safeParse({}).success).toBe(true)
    expect(PortalBody.safeParse({ returnPath: '/account' }).success).toBe(true)
    expect(PortalBody.safeParse({ returnPath: '/editor?project=1' }).success).toBe(true)
    for (const bad of ['account', '//evil.example', 'https://evil.example/x', '']) {
      expect(PortalBody.safeParse({ returnPath: bad }).success, bad).toBe(false)
    }
  })
})
