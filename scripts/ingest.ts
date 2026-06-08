#!/usr/bin/env npx tsx
// ============================================================
//  scripts/ingest.ts
//  Loads textbooks and worked examples into Supabase pgvector
//
//  Usage:
//    npx tsx scripts/ingest.ts                    # ingest all
//    npx tsx scripts/ingest.ts --subject physics  # one subject
//    npx tsx scripts/ingest.ts --file ncert-physics-class11-part1.pdf
//    npx tsx scripts/ingest.ts --reset physics     # delete + re-ingest
//
//  Prerequisites:
//    npm install -D tsx
//    npm install openai @langchain/community langchain pdf-parse
// ============================================================

import * as fs           from 'fs'
import * as path         from 'path'
import { createClient }  from '@supabase/supabase-js'
import OpenAI            from 'openai'
import 'dotenv/config'

// ── Clients ───────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ── Config ────────────────────────────────────────────────────────────────────
const CHUNK_SIZE    = 800    // characters — sweet spot for educational content
const CHUNK_OVERLAP = 150    // overlap keeps context at chunk boundaries
const BATCH_SIZE    = 20     // embeddings per API call
const EMBED_MODEL   = 'text-embedding-3-small'  // 1536 dims, $0.00002/1k tokens
const TEXTBOOKS_DIR = path.join(process.cwd(), 'textbooks')

// ── Document catalogue — edit this to add new books ──────────────────────────
interface DocConfig {
  filePath:    string
  subject:     'physics' | 'mathematics' | 'chemistry' | 'biology'
  curriculum:  string
  sourceTitle: string
  chapter?:    string
  topic?:      string
  fileType:    'pdf' | 'txt'
}

const DOCUMENTS: DocConfig[] = [
  // ── NCERT Physics ───────────────────────────────────────────────────────
  {
    filePath: 'ncert/physics-class11-part1.pdf', subject: 'physics',
    curriculum: 'NCERT', sourceTitle: 'NCERT Physics Class 11 Part 1', fileType: 'pdf',
  },
  {
    filePath: 'ncert/physics-class11-part2.pdf', subject: 'physics',
    curriculum: 'NCERT', sourceTitle: 'NCERT Physics Class 11 Part 2', fileType: 'pdf',
  },
  {
    filePath: 'ncert/physics-class12-part1.pdf', subject: 'physics',
    curriculum: 'NCERT', sourceTitle: 'NCERT Physics Class 12 Part 1', fileType: 'pdf',
  },
  {
    filePath: 'ncert/physics-class12-part2.pdf', subject: 'physics',
    curriculum: 'NCERT', sourceTitle: 'NCERT Physics Class 12 Part 2', fileType: 'pdf',
  },
  // ── NCERT Mathematics ───────────────────────────────────────────────────
  {
    filePath: 'ncert/mathematics-class11.pdf', subject: 'mathematics',
    curriculum: 'NCERT', sourceTitle: 'NCERT Mathematics Class 11', fileType: 'pdf',
  },
  {
    filePath: 'ncert/mathematics-class12.pdf', subject: 'mathematics',
    curriculum: 'NCERT', sourceTitle: 'NCERT Mathematics Class 12', fileType: 'pdf',
  },
  // ── NCERT Chemistry ─────────────────────────────────────────────────────
  {
    filePath: 'ncert/chemistry-class11-part1.pdf', subject: 'chemistry',
    curriculum: 'NCERT', sourceTitle: 'NCERT Chemistry Class 11 Part 1', fileType: 'pdf',
  },
  {
    filePath: 'ncert/chemistry-class11-part2.pdf', subject: 'chemistry',
    curriculum: 'NCERT', sourceTitle: 'NCERT Chemistry Class 11 Part 2', fileType: 'pdf',
  },
  {
    filePath: 'ncert/chemistry-class12-part1.pdf', subject: 'chemistry',
    curriculum: 'NCERT', sourceTitle: 'NCERT Chemistry Class 12 Part 1', fileType: 'pdf',
  },
  {
    filePath: 'ncert/chemistry-class12-part2.pdf', subject: 'chemistry',
    curriculum: 'NCERT', sourceTitle: 'NCERT Chemistry Class 12 Part 2', fileType: 'pdf',
  },
  // ── NCERT Biology ───────────────────────────────────────────────────────
  {
    filePath: 'ncert/biology-class11.pdf', subject: 'biology',
    curriculum: 'NCERT', sourceTitle: 'NCERT Biology Class 11', fileType: 'pdf',
  },
  {
    filePath: 'ncert/biology-class12.pdf', subject: 'biology',
    curriculum: 'NCERT', sourceTitle: 'NCERT Biology Class 12', fileType: 'pdf',
  },
  // ── OpenStax ────────────────────────────────────────────────────────────
  {
    filePath: 'openstax/college-physics.pdf', subject: 'physics',
    curriculum: 'OpenStax', sourceTitle: 'OpenStax College Physics', fileType: 'pdf',
  },
  {
    filePath: 'openstax/calculus-vol1.pdf', subject: 'mathematics',
    curriculum: 'OpenStax', sourceTitle: 'OpenStax Calculus Volume 1', fileType: 'pdf',
  },
  {
    filePath: 'openstax/chemistry-2e.pdf', subject: 'chemistry',
    curriculum: 'OpenStax', sourceTitle: 'OpenStax Chemistry 2e', fileType: 'pdf',
  },
  {
    filePath: 'openstax/biology-2e.pdf', subject: 'biology',
    curriculum: 'OpenStax', sourceTitle: 'OpenStax Biology 2e', fileType: 'pdf',
  },
  // ── Formula sheets (ingest these FIRST — highest ROI) ───────────────────
  {
    filePath: 'formulas/physics-formulas.txt', subject: 'physics',
    curriculum: 'ALL', sourceTitle: 'Physics Formula Reference Sheet',
    fileType: 'txt', topic: 'Formulas',
  },
  {
    filePath: 'formulas/mathematics-formulas.txt', subject: 'mathematics',
    curriculum: 'ALL', sourceTitle: 'Mathematics Formula Reference Sheet',
    fileType: 'txt', topic: 'Formulas',
  },
  {
    filePath: 'formulas/chemistry-formulas.txt', subject: 'chemistry',
    curriculum: 'ALL', sourceTitle: 'Chemistry Formula Reference Sheet',
    fileType: 'txt', topic: 'Formulas',
  },
  {
    filePath: 'formulas/biology-formulas.txt', subject: 'biology',
    curriculum: 'ALL', sourceTitle: 'Biology Formula Reference Sheet',
    fileType: 'txt', topic: 'Formulas',
  },
  // ── Worked examples ─────────────────────────────────────────────────────
  {
    filePath: 'worked-examples/physics-mechanics.txt', subject: 'physics',
    curriculum: 'ALL', sourceTitle: 'Physics Mechanics Worked Examples',
    fileType: 'txt', topic: 'Worked Examples',
  },
  {
    filePath: 'worked-examples/physics-electricity.txt', subject: 'physics',
    curriculum: 'ALL', sourceTitle: 'Physics Electricity Worked Examples',
    fileType: 'txt', topic: 'Worked Examples',
  },
  {
    filePath: 'worked-examples/mathematics-calculus.txt', subject: 'mathematics',
    curriculum: 'ALL', sourceTitle: 'Mathematics Calculus Worked Examples',
    fileType: 'txt', topic: 'Worked Examples',
  },
  {
    filePath: 'worked-examples/mathematics-algebra.txt', subject: 'mathematics',
    curriculum: 'ALL', sourceTitle: 'Mathematics Algebra Worked Examples',
    fileType: 'txt', topic: 'Worked Examples',
  },
  {
    filePath: 'worked-examples/chemistry-reactions.txt', subject: 'chemistry',
    curriculum: 'ALL', sourceTitle: 'Chemistry Reactions Worked Examples',
    fileType: 'txt', topic: 'Worked Examples',
  },
]

// ── Text chunking ─────────────────────────────────────────────────────────────
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  // Clean the text first
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')    // collapse multiple blank lines
    .replace(/[ \t]+/g, ' ')        // collapse multiple spaces
    .replace(/\f/g, '\n\n')         // form feeds (PDF page breaks)
    .trim()

  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    let end = start + size

    // Don't cut in the middle of a sentence if possible
    if (end < cleaned.length) {
      const sentenceEnd = cleaned.lastIndexOf('. ', end)
      const paraEnd     = cleaned.lastIndexOf('\n\n', end)
      const breakPoint  = Math.max(sentenceEnd, paraEnd)
      if (breakPoint > start + size * 0.6) {
        end = breakPoint + 1
      }
    }

    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 50) {  // skip tiny chunks
      chunks.push(chunk)
    }

    start = end - overlap
  }

  return chunks
}

// ── Extract text from PDF ─────────────────────────────────────────────────────
async function extractPdfText(filePath: string): Promise<string> {
  // Dynamic import to avoid issues if pdf-parse not installed
  const pdfParse = (await import('pdf-parse')).default
  const buffer   = fs.readFileSync(filePath)
  const data     = await pdfParse(buffer, {
    // Custom page renderer — removes headers/footers/page numbers
    pagerender: (pageData: { getTextContent: () => Promise<{ items: { str: string; transform: number[] }[] }> }) => {
      return pageData.getTextContent().then((textContent: { items: { str: string; transform: number[] }[] }) => {
        let text = ''
        let lastY: number | null = null
        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            text += '\n'
          }
          text += item.str
          lastY = item.transform[5]
        }
        return text
      })
    }
  })
  return data.text
}

// ── Embed a batch of texts ────────────────────────────────────────────────────
async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: texts.map(t => t.slice(0, 8000)),  // OpenAI token limit safety
  })
  return res.data.map(d => d.embedding)
}

// ── Main ingestion function ───────────────────────────────────────────────────
async function ingestDocument(config: DocConfig): Promise<number> {
  const fullPath = path.join(TEXTBOOKS_DIR, config.filePath)

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⏭  Skipping (file not found): ${config.filePath}`)
    return 0
  }

  // Check if already ingested
  const { data: existing } = await supabase
    .from('ingestion_log')
    .select('id, chunks_count')
    .eq('source_title', config.sourceTitle)
    .single()

  if (existing) {
    console.log(`  ✓  Already ingested: ${config.sourceTitle} (${existing.chunks_count} chunks)`)
    return 0
  }

  console.log(`\n  📄 Ingesting: ${config.sourceTitle}`)
  const startTime = Date.now()

  // 1. Extract text
  let rawText = ''
  if (config.fileType === 'pdf') {
    console.log('     Extracting PDF text...')
    rawText = await extractPdfText(fullPath)
  } else {
    rawText = fs.readFileSync(fullPath, 'utf-8')
  }
  console.log(`     Extracted ${rawText.length.toLocaleString()} characters`)

  // 2. Chunk
  const chunks = chunkText(rawText)
  console.log(`     Split into ${chunks.length} chunks`)

  // 3. Embed + insert in batches
  let inserted = 0
  let failed   = 0

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch      = chunks.slice(i, i + BATCH_SIZE)
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE)

    process.stdout.write(`     Batch ${batchIndex}/${totalBatches} (${inserted} inserted)...\r`)

    try {
      const embeddings = await embedBatch(batch)

      const rows = batch.map((content, j) => ({
        subject:      config.subject,
        curriculum:   config.curriculum,
        source_title: config.sourceTitle,
        chapter:      config.chapter   ?? null,
        topic:        config.topic     ?? null,
        content,
        embedding:    embeddings[j],
        metadata: {
          char_count:  content.length,
          chunk_index: i + j,
          file_path:   config.filePath,
        },
      }))

      const { error } = await supabase
        .from('knowledge_chunks')
        .insert(rows)

      if (error) {
        console.error(`\n     ❌ Insert error: ${error.message}`)
        failed += batch.length
      } else {
        inserted += batch.length
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`\n     ❌ Batch error: ${message}`)
      failed += batch.length
      // Wait before retrying (rate limit handling)
      await new Promise(r => setTimeout(r, 2000))
    }

    // Throttle to respect OpenAI rate limits (3000 RPM on free tier)
    await new Promise(r => setTimeout(r, 100))
  }

  // 4. Log ingestion
  await supabase.from('ingestion_log').insert({
    source_title: config.sourceTitle,
    subject:      config.subject,
    curriculum:   config.curriculum,
    chunks_count: inserted,
  })

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n     ✅ Done: ${inserted} chunks inserted, ${failed} failed (${elapsed}s)`)

  return inserted
}

// ── Delete all chunks for a subject (for re-ingestion) ───────────────────────
async function resetSubject(subject: string) {
  const { error } = await supabase
    .from('knowledge_chunks')
    .delete()
    .eq('subject', subject)

  await supabase
    .from('ingestion_log')
    .delete()
    .eq('subject', subject)

  if (error) {
    console.error(`Failed to reset ${subject}:`, error.message)
  } else {
    console.log(`✅ Reset all ${subject} chunks`)
  }
}

// ── Show knowledge base stats ─────────────────────────────────────────────────
async function showStats() {
  const { data } = await supabase.rpc('get_knowledge_base_stats')
  if (!data?.length) {
    console.log('Knowledge base is empty. Run ingestion first.')
    return
  }

  console.log('\n📊 Knowledge Base Stats:')
  console.log('─'.repeat(70))

  let lastSubject = ''
  let totalChunks = 0
  for (const row of data) {
    if (row.subject !== lastSubject) {
      console.log(`\n${row.subject.toUpperCase()}`)
      lastSubject = row.subject
    }
    console.log(`  ${row.curriculum.padEnd(12)} | ${row.source_title.padEnd(40)} | ${row.chunk_count} chunks`)
    totalChunks += Number(row.chunk_count)
  }
  console.log('─'.repeat(70))
  console.log(`Total: ${totalChunks.toLocaleString()} chunks\n`)
}

// ── CLI entry point ───────────────────────────────────────────────────────────
async function main() {
  const args          = process.argv.slice(2)
  const subjectFilter = args[args.indexOf('--subject') + 1]
  const fileFilter    = args[args.indexOf('--file')    + 1]
  const resetSubj     = args[args.indexOf('--reset')   + 1]
  const showStatsOnly = args.includes('--stats')

  console.log('\n🧠 Solvr RAG Ingestion Pipeline')
  console.log('══════════════════════════════════\n')

  // Stats only
  if (showStatsOnly) {
    await showStats()
    return
  }

  // Reset a subject
  if (resetSubj) {
    console.log(`🗑  Resetting ${resetSubj} chunks...`)
    await resetSubject(resetSubj)
    console.log('Now re-running ingestion...\n')
  }

  // Filter documents
  let docs = DOCUMENTS
  if (subjectFilter) {
    docs = docs.filter(d => d.subject === subjectFilter)
    console.log(`Filtered to ${docs.length} documents for subject: ${subjectFilter}`)
  }
  if (fileFilter) {
    docs = docs.filter(d => d.filePath.includes(fileFilter))
    console.log(`Filtered to ${docs.length} documents matching: ${fileFilter}`)
  }

  // Estimate cost
  const availableDocs   = docs.filter(d => fs.existsSync(path.join(TEXTBOOKS_DIR, d.filePath)))
  console.log(`📁 Found ${availableDocs.length}/${docs.length} files on disk`)
  console.log(`💰 Estimated cost: ~$${(availableDocs.length * 0.05).toFixed(2)} USD (very rough estimate)\n`)

  // Ingest
  let totalInserted = 0
  for (const doc of docs) {
    totalInserted += await ingestDocument(doc)
  }

  console.log(`\n══════════════════════════════════`)
  console.log(`✅ Ingestion complete: ${totalInserted.toLocaleString()} total chunks`)

  await showStats()
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
