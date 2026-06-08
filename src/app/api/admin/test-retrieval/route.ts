import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-guard'
import { getOpenAI } from '@/lib/openai/client'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Auth — admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthorised', 401)

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return apiError('Admin access required', 403)

  const { query, subject } = await req.json()
  if (!query || !subject) return apiError('query and subject required', 400)

  // Embed the test query
  const embRes = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: query.slice(0, 8000),
  })
  const embedding = embRes.data[0].embedding

  // Search with a lower threshold for testing (so you can see near-misses)
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding:  embedding,
    match_subject:    subject,
    match_curriculum: null,
    match_count:      8,
    match_threshold:  0.50,  // lower than prod (0.62) to show more results in testing
  })

  if (error) return apiError(error.message, 500)

  const results = (data ?? []).map((row: {
    content: string
    source_title: string
    chapter: string | null
    curriculum: string
    similarity: number
  }) => ({
    content:     row.content,
    sourceTitle: row.source_title,
    chapter:     row.chapter,
    curriculum:  row.curriculum,
    similarity:  row.similarity,
  }))

  return NextResponse.json({ results, total: results.length })
}
