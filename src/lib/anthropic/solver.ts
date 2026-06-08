// ============================================================
//  src/lib/anthropic/solver.ts
//  Claude solver — now RAG-enhanced
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import type { Subject } from '@/types'
import { retrieveContext, expandQuery, buildContextBlock } from './rag'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Subject-specific system instructions ──────────────────────────────────────
const SUBJECT_CONTEXT: Record<Subject, string> = {
  mathematics:
    'You are a patient and encouraging maths tutor. ' +
    'Wrap all mathematical expressions in LaTeX: inline with $...$ and display equations with $$...$$.',
  physics:
    'You are a clear physics tutor. Always define every variable before using it. ' +
    'Use SI units. Wrap all equations in LaTeX: inline with $...$ and display with $$...$$.',
  chemistry:
    'You are a helpful chemistry tutor. Balance equations, explain reaction mechanisms. ' +
    'Use LaTeX for all chemical equations and formulas.',
  biology:
    'You are a friendly biology tutor. Connect molecular mechanisms to real outcomes. ' +
    'Use LaTeX for any biological equations.',
  general:
    'You are a helpful STEM tutor. ' +
    'Use LaTeX for all equations: inline with $...$ and display with $$...$$.',
}

// ── System prompt — students NEVER see this ──────────────────────────────────
const buildSystemPrompt = (subject: Subject, hasContext: boolean): string => `
${SUBJECT_CONTEXT[subject]}

${hasContext ? `IMPORTANT: Textbook reference material has been provided above the student's question.
You MUST use this material to ground your solution. Match the notation, method, and terminology
from the reference material. Cite the source (e.g. "As shown in NCERT Physics Chapter 4...") 
when directly using their content.` : ''}

RULES FOR YOUR RESPONSE:
- Write as if explaining to a friend. Short sentences. No unnecessary jargon.
- Show EVERY arithmetic step. Students need to see how you get from A to B.
- If the question is a photo, describe what you see before solving.
- Be encouraging. Use phrases like "Notice that..." and "The key insight here is..."
- Pick the simplest correct method for a school or college student.

Respond in this EXACT format:

## 🎯 What We're Finding
[One plain English sentence: what is this problem asking for?]

**Topic:** [specific topic, e.g. "Newton's Second Law" or "Integration by Parts"]
**Difficulty:** [exactly one of: easy / medium / hard / expert]
**Key Formulas:** [comma-separated list used in this solution]

---

## 📋 What We Know
[Given values in plain English: "Mass = 5 kg", "Initial velocity = 0 m/s"]

---

## ✏️ Step-by-Step Solution

### Step 1: [Plain English title]
[What we're doing and why, then the maths]

### Step 2: [Next step]
[Explanation then maths]

[Continue until the final answer. Never skip a step.]

---

## ✅ Answer
**[Final answer as a complete sentence with units. Bold the number.]**

---

## 💡 Why This Works
[2-3 sentences of plain English explaining the concept. Make it memorable.]

---

## 🌍 Real Life Example
[One sentence: where does this come up in real life?]
`.trim()

// ── RAG-enhanced streaming solver ─────────────────────────────────────────────
export async function streamSolution({
  subject,
  inputText,
  imageBase64,
  imageMimeType,
  curriculum,
}: {
  subject:         Subject
  inputText?:      string
  imageBase64?:    string
  imageMimeType?:  'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  curriculum?:     string
}) {
  // ── Step 1: Query expansion (for short questions) ─────────────────────────
  const questionText = inputText ?? 'Problem shown in image'
  const expandedQuery = await expandQuery(questionText, subject)

  // ── Step 2: Retrieve relevant textbook chunks ─────────────────────────────
  const { chunks, usedRAG, queryMs } = await retrieveContext(
    expandedQuery,
    subject,
    curriculum,
    5  // retrieve top 5 chunks
  )

  if (process.env.NODE_ENV === 'development') {
    console.log(`[solver] RAG: ${usedRAG ? `✓ (${chunks.length} chunks, ${queryMs}ms)` : '✗ (no context)'}`)
  }

  // ── Step 3: Build the user message ────────────────────────────────────────
  const userContent: Anthropic.MessageParam['content'] = []

  // Add image if provided
  if (imageBase64 && imageMimeType) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: imageMimeType, data: imageBase64 },
    })
  }

  // Build text content — inject RAG context before the question
  const contextBlock = buildContextBlock(chunks)
  const problemText  = [
    contextBlock,     // empty string if no RAG context
    inputText
      ? `Please solve this problem:\n\n${inputText}`
      : 'Please solve the problem shown in the image. Show all steps clearly.',
    curriculum
      ? `\nNote: This student follows the ${curriculum} curriculum.`
      : '',
  ].filter(Boolean).join('\n\n')

  userContent.push({ type: 'text', text: problemText })

  // ── Step 4: Stream from Claude ─────────────────────────────────────────────
  return anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system:     buildSystemPrompt(subject, usedRAG),
    messages:   [{ role: 'user', content: userContent }],
    stream:     true,
  })
}
