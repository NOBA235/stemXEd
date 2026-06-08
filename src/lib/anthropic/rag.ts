// ============================================================
//  src/lib/anthropic/rag.ts
//  Retrieval-Augmented Generation — core retrieval logic
//
//  Called on every /api/solve request before Claude gets involved.
//  Gracefully degrades — if retrieval fails, solve continues without it.
// ============================================================

import type { Subject } from '@/types'
import { getOpenAI } from '@/lib/openai/client'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RetrievedChunk {
  id:          string
  content:     string
  sourceTitle: string
  chapter:     string | null
  topic:       string | null
  curriculum:  string
  similarity:  number
}

export interface RetrievalResult {
  chunks:     RetrievedChunk[]
  usedRAG:    boolean    // false if retrieval failed or returned nothing
  queryMs:    number     // how long retrieval took
}

// ── Embed a query string ──────────────────────────────────────────────────────
async function embedQuery(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),  // safety limit
  })
  return res.data[0].embedding
}

// ── Main retrieval function ───────────────────────────────────────────────────
export async function retrieveContext(
  question:   string,
  subject:    Subject,
  curriculum?: string,   // if user selected a curriculum, filter to it
  topK = 5
): Promise<RetrievalResult> {
  const start = Date.now()

  try {
    // Lazy import server client to avoid issues in edge runtime
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = createServiceClient()

    // 1. Embed the student's question
    const embedding = await embedQuery(question)

    // 2. Search pgvector with cosine similarity
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding:  embedding,
      match_subject:    subject,
      match_curriculum: curriculum ?? null,
      match_count:      topK,
      match_threshold:  0.62,  // tuned threshold — lower = more results, less relevant
    })

    if (error) {
      console.error('[RAG] pgvector search error:', error.message)
      return { chunks: [], usedRAG: false, queryMs: Date.now() - start }
    }

    if (!data || data.length === 0) {
      // No relevant chunks found — gracefully degrade
      if (process.env.NODE_ENV === 'development') {
        console.log(`[RAG] No chunks found for "${question.slice(0, 60)}..."`)
      }
      return { chunks: [], usedRAG: false, queryMs: Date.now() - start }
    }

    const chunks: RetrievedChunk[] = data.map((row: {
      id: string
      content: string
      source_title: string
      chapter: string | null
      topic: string | null
      curriculum: string
      similarity: number
    }) => ({
      id:          row.id,
      content:     row.content,
      sourceTitle: row.source_title,
      chapter:     row.chapter,
      topic:       row.topic,
      curriculum:  row.curriculum,
      similarity:  row.similarity,
    }))

    // Dev logging — useful when tuning retrieval quality
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RAG] Retrieved ${chunks.length} chunks in ${Date.now() - start}ms`)
      chunks.forEach((c, i) => {
        console.log(`  ${i + 1}. [${c.similarity.toFixed(3)}] ${c.sourceTitle} — ${c.chapter ?? c.topic ?? 'General'}`)
      })
    }

    return {
      chunks,
      usedRAG:  true,
      queryMs:  Date.now() - start,
    }

  } catch (err) {
    // Never crash the solve route because of RAG failure
    console.error('[RAG] Retrieval failed (graceful degradation):', err)
    return { chunks: [], usedRAG: false, queryMs: Date.now() - start }
  }
}

// ── Format chunks into a clean context block for Claude's prompt ──────────────
export function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''

  const sections = chunks.map((chunk, i) => {
    const source = [
      chunk.sourceTitle,
      chunk.chapter,
      chunk.topic,
    ].filter(Boolean).join(' → ')

    return `[Reference ${i + 1}: ${source}]\n${chunk.content}`
  })

  return `RELEVANT TEXTBOOK CONTENT
Use this material to ground your solution. Prefer methods and notation from these sources.
${'─'.repeat(60)}
${sections.join('\n\n─────\n\n')}
${'─'.repeat(60)}`
}

// ── Query expansion — improves retrieval for short/vague questions ────────────
// Takes "F=ma problem" and expands to a better search query
export async function expandQuery(
  question: string,
  subject:  Subject
): Promise<string> {
  // For short questions, expand them before embedding
  // For longer questions (>50 chars), they're already descriptive enough
  if (question.length > 80 || !process.env.OPENAI_API_KEY) return question

  try {
    // Use a cheap, fast model just for expansion
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 60,
      messages: [{
        role: 'system',
        content: `You expand short ${subject} questions into more descriptive search queries. 
Return ONLY the expanded query, nothing else. Keep it under 50 words.`,
      }, {
        role: 'user',
        content: `Expand this into a descriptive search query: "${question}"`,
      }],
    })
    return completion.choices[0]?.message?.content?.trim() ?? question
  } catch {
    return question  // fall back to original
  }
}
