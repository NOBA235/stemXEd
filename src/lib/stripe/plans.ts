import type { PlanConfig } from '@/types'

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    stripePriceId: { monthly: '', yearly: '' },
    limits: {
      problemsPerMonth: 5,
      labAccess: false,
      imageUpload: false,
      pdfUpload: false,
      historyDays: 3,
      priorityProcessing: false,
      exportPdf: false,
    },
    features: [
      '5 problems / month',
      'Text input only',
      'Step-by-step AI solutions',
      '3-day history',
    ],
  },

  basic: {
    id: 'basic',
    name: 'Basic',
    price: { monthly: 9, yearly: 79 },
    stripePriceId: {
      monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || '',
      yearly:  process.env.STRIPE_BASIC_YEARLY_PRICE_ID  || '',
    },
    limits: {
      problemsPerMonth: 150,
      labAccess: true,
      imageUpload: true,
      pdfUpload: false,
      historyDays: 90,
      priorityProcessing: false,
      exportPdf: false,
    },
    features: [
      '150 problems / month',
      'Photo upload — snap & solve',
      'All 4 virtual labs',
      'Full step-by-step solutions',
      '90-day history',
      'Bookmark problems',
    ],
    highlight: true,
  },

  premium: {
    id: 'premium',
    name: 'Premium',
    price: { monthly: 19, yearly: 159 },
    stripePriceId: {
      monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '',
      yearly:  process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID  || '',
    },
    limits: {
      problemsPerMonth: -1,
      labAccess: true,
      imageUpload: true,
      pdfUpload: true,
      historyDays: -1,
      priorityProcessing: true,
      exportPdf: true,
    },
    features: [
      'Unlimited problems',
      'Photo + PDF upload',
      'All 4 virtual labs',
      'Priority AI processing',
      'Export solutions as PDF',
      'Unlimited history',
      'Early access to new features',
    ],
  },
}

export const PLAN_LIST = Object.values(PLANS)

export function getPlanLimits(plan: string) {
  return PLANS[plan]?.limits ?? PLANS.free.limits
}

export function canUsePlan(plan: string, feature: keyof PlanConfig['limits']): boolean {
  const limits = getPlanLimits(plan)
  const val = limits[feature]
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val === -1 || val > 0
  return false
}
