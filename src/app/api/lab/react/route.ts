import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { apiGuard, apiError } from '@/lib/api-guard'
import { validateLabPayload, ValidationError } from '@/lib/validate'
import { SUBJECT_PROMPTS, VALID_EFFECTS } from '@/lib/anthropic/lab-prompts'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  // Auth + lab feature gate
  const guard = await apiGuard({ requireFeature: 'labAccess' })
  if ('status' in guard) return guard

  const { user } = guard

  let body: unknown
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  let payload
  try { payload = validateLabPayload(body) }
  catch (e) {
    if (e instanceof ValidationError) return apiError(e.message, 400, { field: e.field })
    return apiError('Validation failed', 400)
  }

  const systemPrompt = SUBJECT_PROMPTS[payload.subject]
  if (!systemPrompt) return apiError('Invalid subject', 400)

  const userPrompt = `Inputs: ${payload.inputs.join(', ')}\nEquipment: ${payload.equipment.join(', ') || 'standard'}\nAction: ${payload.action}\nRespond only with the JSON object.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    if (!raw) throw new Error('Empty response')

    let result: Record<string, unknown>
    try {
      result = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Invalid JSON from AI')
      result = JSON.parse(match[0])
    }

    const validEffects = VALID_EFFECTS[payload.subject] || ['none']
    if (!validEffects.includes(result.visualEffect as string)) {
      result.visualEffect = 'none'
    }

    const supabase = await createClient()
    const { data: experiment } = await supabase
      .from('experiments')
      .insert({
        user_id:   user.id,
        subject:   payload.subject,
        inputs:    payload.inputs,
        equipment: payload.equipment,
        action:    payload.action,
        result,
      })
      .select('id')
      .single()

    return NextResponse.json({ experimentId: experiment?.id, result })
  } catch (err) {
    console.error('[/api/lab/react]', err)
    return apiError('AI processing failed', 500)
  }
}
