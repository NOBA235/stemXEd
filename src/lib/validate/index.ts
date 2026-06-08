// ============================================================
//  Input Validation — Zod schemas for every API surface
//  Validate BEFORE touching DB or calling Claude
// ============================================================

// We implement lightweight validation without Zod to avoid adding a dep.
// Swap for Zod if you prefer: npm i zod

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// ── Allowed values ───────────────────────────────────────────────────────────
const VALID_SUBJECTS  = ['mathematics', 'physics', 'chemistry', 'biology', 'general'] as const
const VALID_INPUT_TYPES = ['text', 'image', 'pdf'] as const
const VALID_PLANS     = ['basic', 'premium'] as const
const VALID_BILLING   = ['monthly', 'yearly'] as const
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'] as const
const MAX_TEXT_LENGTH = 4000     // characters
const MAX_FILE_SIZE   = 10 * 1024 * 1024  // 10 MB

// ── Solve request ────────────────────────────────────────────────────────────
export interface SolvePayload {
  subject: typeof VALID_SUBJECTS[number]
  inputType: typeof VALID_INPUT_TYPES[number]
  text?: string
  fileBase64?: string
  mimeType?: typeof VALID_MIME_TYPES[number]
}

export function validateSolvePayload(body: unknown): SolvePayload {
  if (!body || typeof body !== 'object') throw new ValidationError('body', 'Invalid request body')
  const b = body as Record<string, unknown>

  // subject
  if (!VALID_SUBJECTS.includes(b.subject as any)) {
    throw new ValidationError('subject', `subject must be one of: ${VALID_SUBJECTS.join(', ')}`)
  }

  // inputType
  if (!VALID_INPUT_TYPES.includes(b.inputType as any)) {
    throw new ValidationError('inputType', `inputType must be one of: ${VALID_INPUT_TYPES.join(', ')}`)
  }

  // text — required for text input, optional for image/pdf
  if (b.inputType === 'text') {
    if (!b.text || typeof b.text !== 'string' || b.text.trim().length < 5) {
      throw new ValidationError('text', 'text is required and must be at least 5 characters')
    }
    if (b.text.length > MAX_TEXT_LENGTH) {
      throw new ValidationError('text', `text must be under ${MAX_TEXT_LENGTH} characters`)
    }
  }

  // file — required for image/pdf inputs
  if (b.inputType === 'image' || b.inputType === 'pdf') {
    if (!b.fileBase64 || typeof b.fileBase64 !== 'string') {
      throw new ValidationError('fileBase64', 'fileBase64 is required for image/pdf input')
    }
    // Approximate size check (base64 is ~1.37x larger than binary)
    const approxBytes = (b.fileBase64.length * 3) / 4
    if (approxBytes > MAX_FILE_SIZE) {
      throw new ValidationError('fileBase64', `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
    }
    if (!b.mimeType || !VALID_MIME_TYPES.includes(b.mimeType as any)) {
      throw new ValidationError('mimeType', `mimeType must be one of: ${VALID_MIME_TYPES.join(', ')}`)
    }
    // PDF check
    if (b.inputType === 'pdf' && b.mimeType !== 'application/pdf') {
      throw new ValidationError('mimeType', 'mimeType must be application/pdf for pdf input')
    }
    // Image check
    if (b.inputType === 'image' && b.mimeType === 'application/pdf') {
      throw new ValidationError('mimeType', 'mimeType must be an image type for image input')
    }
  }

  return b as unknown as SolvePayload
}

// ── Lab react request ────────────────────────────────────────────────────────
const VALID_LAB_SUBJECTS = ['chemistry', 'physics', 'mathematics', 'biology'] as const

export interface LabPayload {
  subject: typeof VALID_LAB_SUBJECTS[number]
  inputs: string[]
  equipment: string[]
  action: string
}

export function validateLabPayload(body: unknown): LabPayload {
  if (!body || typeof body !== 'object') throw new ValidationError('body', 'Invalid request body')
  const b = body as Record<string, unknown>

  if (!VALID_LAB_SUBJECTS.includes(b.subject as any)) {
    throw new ValidationError('subject', 'Invalid subject')
  }
  if (!Array.isArray(b.inputs) || b.inputs.length === 0 || b.inputs.length > 10) {
    throw new ValidationError('inputs', 'inputs must be an array of 1-10 items')
  }
  // Sanitize each input string
  const safeInputs = b.inputs.map((s: unknown) => {
    if (typeof s !== 'string') throw new ValidationError('inputs', 'Each input must be a string')
    if (s.length > 100) throw new ValidationError('inputs', 'Each input must be under 100 characters')
    return s.trim()
  })
  if (typeof b.action !== 'string' || b.action.trim().length === 0 || b.action.length > 100) {
    throw new ValidationError('action', 'action must be a non-empty string under 100 characters')
  }

  return {
    subject: b.subject as any,
    inputs: safeInputs,
    equipment: Array.isArray(b.equipment) ? b.equipment.slice(0, 6).map(String) : [],
    action: b.action.trim(),
  }
}

// ── Subscription create request ──────────────────────────────────────────────
export interface SubscriptionPayload {
  plan: typeof VALID_PLANS[number]
  billing: typeof VALID_BILLING[number]
}

export function validateSubscriptionPayload(body: unknown): SubscriptionPayload {
  if (!body || typeof body !== 'object') throw new ValidationError('body', 'Invalid request body')
  const b = body as Record<string, unknown>
  if (!VALID_PLANS.includes(b.plan as any)) throw new ValidationError('plan', 'Invalid plan')
  if (!VALID_BILLING.includes(b.billing as any)) throw new ValidationError('billing', 'Invalid billing interval')
  return { plan: b.plan as any, billing: b.billing as any }
}

// ── Sanitize user-facing strings (strip HTML/script tags) ───────────────────
export function sanitizeString(input: unknown, maxLen = 500): string {
  if (typeof input !== 'string') return ''
  return input
    .slice(0, maxLen)
    .replace(/<[^>]*>/g, '')       // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip JS protocol
    .trim()
}
