// ============================================================
//  Solvr AI — Core Types
// ============================================================

export type Plan = 'free' | 'basic' | 'premium'
export type Subject = 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'general'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type InputType = 'text' | 'image' | 'pdf'
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid'

// ---- Database row types ----
export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'student' | 'teacher' | 'admin'
  problems_used: number
  experiments_run: number
  usage_reset_at: string
  plan: Plan
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  status: SubscriptionStatus
  plan: 'basic' | 'premium'
  billing_interval: 'month' | 'year'
  stripe_price_id: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
  created_at: string
  updated_at: string
}

export interface Problem {
  id: string
  user_id: string
  subject: Subject
  input_type: InputType
  input_text: string | null
  file_path: string | null
  file_url: string | null
  solution_markdown: string | null
  topic: string | null
  difficulty: Difficulty | null
  key_formulas: string[] | null
  is_bookmarked: boolean
  processing_time_ms: number | null
  model_used: string | null
  created_at: string
}

export interface Experiment {
  id: string
  user_id: string
  subject: 'chemistry' | 'physics' | 'mathematics' | 'biology'
  inputs: string[]
  equipment: string[]
  action: string
  result: ExperimentResult | null
  created_at: string
}

export interface ExperimentResult {
  outcome: string
  equation: string
  explanation: string
  realWorldUse: string
  safetyWarning: string
  visualEffect: VisualEffect
  funFact: string
}

export type VisualEffect =
  | 'bubble' | 'colorChange' | 'smoke' | 'explosion'
  | 'oscillate' | 'projectile' | 'wave' | 'spark'
  | 'graph' | 'spiral' | 'geometric'
  | 'divide' | 'pulse' | 'bloom'
  | 'none'

// ---- Subscription plan config ----
export interface PlanConfig {
  id: Plan
  name: string
  price: { monthly: number; yearly: number }
  stripePriceId: { monthly: string; yearly: string }
  limits: {
    problemsPerMonth: number  // -1 = unlimited
    labAccess: boolean
    imageUpload: boolean
    pdfUpload: boolean
    historyDays: number       // -1 = unlimited
    priorityProcessing: boolean
    exportPdf: boolean
  }
  features: string[]
  highlight?: boolean
}

// ---- API Response types ----
export interface SolveStreamChunk {
  type: 'delta' | 'done' | 'error'
  content?: string
  metadata?: {
    topic?:            string
    difficulty?:       Difficulty
    keyFormulas?:      string[]
    processingTimeMs?: number
    classLevel?:       number
    chapter?:          string
    conceptTags?:      string[]
    video?:            VideoRecommendation | null
  }
  error?: string
}

// ---- Video recommendation ----
export interface VideoRecommendation {
  youtube_id: string
  title:      string
}

// ---- UI State ----
export interface UploadedFile {
  file: File
  preview?: string
  type: 'image' | 'pdf'
}
