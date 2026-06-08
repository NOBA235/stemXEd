// ============================================================
//  POST /api/solve  — RAG-enhanced streaming solver
//  v2: extracts structured metadata + queries video library
// ============================================================
import { NextRequest } from 'next/server'
import { apiGuard, apiError } from '@/lib/api-guard'
import { validateSolvePayload, ValidationError } from '@/lib/validate'
import { streamSolution } from '@/lib/anthropic/solver'
import { createClient } from '@/lib/supabase/server'
import type { Subject, VideoRecommendation } from '@/types'

export const runtime     = 'nodejs'
export const maxDuration = 60

// ── Helpers to extract structured metadata from completed solution text ────────
function extractClassLevel(text: string): number | null {
  const m = text.match(/\*\*Class Level:\*\*\s*(\d+)/i)
  const n = m ? parseInt(m[1], 10) : null
  return n && n >= 8 && n <= 13 ? n : null
}

function extractChapter(text: string): string | null {
  const m = text.match(/\*\*Chapter:\*\*\s*(.+)/i)
  return m?.[1]?.trim() ?? null
}

function extractConceptTags(text: string): string[] {
  const m = text.match(/\*\*Concept Tags:\*\*\s*(.+)/i)
  if (!m?.[1]) return []
  return m[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 5)
}

// ── Query videos table for the best matching video ─────────────────────────────
async function findRecommendedVideo(
  subject:     string,
  classLevel:  number | null,
  chapter:     string | null,
  conceptTags: string[]
): Promise<VideoRecommendation | null> {
  if (!classLevel || !chapter || conceptTags.length === 0) return null

  try {
    const supabase = await createClient()

    // First try: exact match on all three fields + concept tag overlap
    const { data: exact } = await supabase
      .from('videos')
      .select('youtube_id, title')
      .eq('subject',     subject)
      .eq('class_level', classLevel)
      .ilike('chapter',  `%${chapter.split(' ').slice(0, 3).join('%')}%`) // fuzzy chapter match
      .overlaps('concept_tags', conceptTags)
      .limit(1)
      .single()

    if (exact) return { youtube_id: exact.youtube_id, title: exact.title }

    // Fallback: just subject + class level + concept overlap (drop chapter requirement)
    const { data: fallback } = await supabase
      .from('videos')
      .select('youtube_id, title')
      .eq('subject',     subject)
      .eq('class_level', classLevel)
      .overlaps('concept_tags', conceptTags)
      .limit(1)
      .single()

    if (fallback) return { youtube_id: fallback.youtube_id, title: fallback.title }

    return null
  } catch {
    // Never crash the solve flow because of video lookup failure
    return null
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth + quota guard
  const guard = await apiGuard({ checkProblemQuota: true })
  if ('status' in guard) return guard
  const { user } = guard

  // 2. Parse + validate
  let body: unknown
  try { body = await req.json() } catch { return apiError('Invalid JSON body', 400) }

  let payload
  try { payload = validateSolvePayload(body) }
  catch (e) {
    if (e instanceof ValidationError) return apiError(e.message, 400, { field: e.field })
    return apiError('Validation failed', 400)
  }

  // 3. Feature gates
  if (payload.inputType === 'image') {
    const g = await apiGuard({ requireFeature: 'imageUpload' })
    if ('status' in g) return g
  }
  if (payload.inputType === 'pdf') {
    const g = await apiGuard({ requireFeature: 'pdfUpload' })
    if ('status' in g) return g
  }

  // 4. Extract curriculum
  const curriculum = typeof (body as Record<string, unknown>).curriculum === 'string'
    ? (body as Record<string, unknown>).curriculum as string
    : undefined

  const startMs = Date.now()
  let fullText  = ''

  // 5. Stream RAG-enhanced solution
  const stream = new ReadableStream({
    async start(controller) {
      const enc  = new TextEncoder()
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))

      try {
        const claudeStream = await streamSolution({
          subject:       payload.subject as Subject,
          inputText:     payload.text,
          imageBase64:   payload.fileBase64,
          imageMimeType: payload.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | undefined,
          curriculum,
        })

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = event.delta.text
            fullText += chunk
            send({ type: 'delta', content: chunk })
          }
        }

        const processingMs = Date.now() - startMs

        // ── Extract metadata from completed solution text ───────────────────
        const topicMatch   = fullText.match(/\*\*Topic:\*\*\s*(.+)/i)
        const diffMatch    = fullText.match(/\*\*Difficulty:\*\*\s*(easy|medium|hard|expert)/i)
        const formulaMatch = fullText.match(/\*\*Key Formulas:\*\*\s*(.+)/i)

        const classLevel  = extractClassLevel(fullText)
        const chapter     = extractChapter(fullText)
        const conceptTags = extractConceptTags(fullText)

        // ── Query video library ─────────────────────────────────────────────
        const video = await findRecommendedVideo(
          payload.subject,
          classLevel,
          chapter,
          conceptTags
        )

        if (process.env.NODE_ENV === 'development') {
          console.log(`[solve] classLevel=${classLevel} chapter="${chapter}" tags=${conceptTags.join(',')}`)
          console.log(`[solve] video: ${video ? video.title : 'none found'}`)
        }

        const metadata = {
          topic:            topicMatch?.[1]?.trim(),
          difficulty:       diffMatch?.[1]?.toLowerCase(),
          keyFormulas:      formulaMatch?.[1]?.split(',').map((f: string) => f.trim()).filter(Boolean),
          processingTimeMs: processingMs,
          classLevel:       classLevel ?? undefined,
          chapter:          chapter    ?? undefined,
          conceptTags:      conceptTags.length ? conceptTags : undefined,
          video:            video,   // null if no match — frontend handles gracefully
        }

        send({ type: 'done', metadata })
        controller.close()

        // ── Persist to DB + increment usage (fire-and-forget) ───────────────
        const supabase = await createClient()
        await Promise.all([
          supabase.from('problems').insert({
            user_id:            user.id,
            subject:            payload.subject,
            input_type:         payload.inputType,
            input_text:         payload.text ?? null,
            solution_markdown:  fullText,
            topic:              metadata.topic    ?? null,
            difficulty:         metadata.difficulty ?? null,
            key_formulas:       metadata.keyFormulas ?? null,
            processing_time_ms: processingMs,
            model_used:         'claude-sonnet-4-20250514',
          }),
          supabase.rpc('increment_problems_used', { user_id: user.id }),
        ])

      } catch (err) {
        console.error('[/api/solve]', err)
        send({ type: 'error', error: 'AI processing failed. Please try again.' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':           'text/event-stream',
      'Cache-Control':          'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
      'Connection':             'keep-alive',
    },
  })
}
