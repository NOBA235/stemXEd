# Solvr AI — Project Documentation

**Version:** 1.0.0
**Built by:** [Your Name], Nagaland, India
**Category:** EdTech / AI-Powered Learning
**Status:** Beta

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Key Features](#4-key-features)
5. [Technical Architecture](#5-technical-architecture)
6. [Technology Stack](#6-technology-stack)
7. [System Design](#7-system-design)
8. [Database Schema](#8-database-schema)
9. [AI Integration](#9-ai-integration)
10. [RAG Knowledge System](#10-rag-knowledge-system)
11. [Security Architecture](#11-security-architecture)
12. [API Reference](#12-api-reference)
13. [Subscription Model](#13-subscription-model)
14. [File Structure](#14-file-structure)
15. [Setup and Installation](#15-setup-and-installation)
16. [Deployment](#16-deployment)
17. [Future Roadmap](#17-future-roadmap)

---

## 1. Project Overview

Solvr AI is a full-stack, production-grade web application that uses artificial intelligence to help students aged 13 and above solve problems across four STEM subjects — Mathematics, Physics, Chemistry, and Biology.

Students type a question or upload a photo of their textbook or worksheet. Solvr AI analyses the problem, retrieves relevant content from a curated knowledge base of textbooks and worked examples, and streams a complete step-by-step solution back to the student in real time. Solutions are rendered with professional mathematical notation using KaTeX.

The platform includes a subscription model (Free, Basic, Premium), a virtual interactive lab simulator for all four subjects, a full experiment history, and a RAG (Retrieval-Augmented Generation) system that grounds AI answers in specific curriculum material such as NCERT, CBSE, IGCSE, AP, and IB.

---

## 2. Problem Statement

Students studying STEM subjects in India and globally face a consistent set of problems:

**Getting stuck with no help available.** When a student is stuck on a problem at 10pm, their teacher is not available. Tutors are expensive. Generic internet searches return answers without explanations.

**Answers without understanding.** Existing tools like calculators and answer-checkers give the final answer but do not explain the method. Students can copy an answer without learning anything.

**Curriculum mismatch.** Generic AI tools answer from general training data. They may use methods, terminology, or notation that does not match what the student has been taught in their specific curriculum. A NCERT student and a Cambridge IGCSE student learn the same physics but through different frameworks.

**Cost of private tutoring.** Quality tutoring in India costs ₹500–2000 per hour and is inaccessible for most students outside major cities, particularly in the Northeast.

---

## 3. Solution

Solvr AI addresses all four problems directly:

- **Always available.** The AI responds in under 5 seconds at any time of day.
- **Step by step, not just answers.** Every solution shows every step of working, with plain English explanations between mathematical steps. The system prompt explicitly instructs the AI never to skip steps.
- **Curriculum-aligned.** A RAG system retrieves relevant passages from NCERT, OpenStax, and other curriculum-specific textbooks before answering, ensuring the method and notation match what the student has been taught.
- **Affordable.** A free plan provides 5 problems per month at no cost. The paid Basic plan costs $9/month — a fraction of one hour of tutoring.

---

## 4. Key Features

### 4.1 AI Problem Solver
The core feature. Students type any question or upload a photo. The system streams a structured solution with clearly labelled sections: what we're finding, what we know, step-by-step working, final answer, why it works, and a real-life connection.

### 4.2 Photo Upload
Basic and Premium plan users can photograph a problem from a textbook, worksheet, or whiteboard. Claude's vision capability reads the image and solves it exactly as it would a typed question.

### 4.3 KaTeX Mathematical Rendering
All mathematical expressions in solutions are rendered using KaTeX — the same rendering engine used by Khan Academy and Wikipedia. Students see properly typeset equations, fractions, integrals, and symbols rather than plain text approximations.

### 4.4 Curriculum Selector
Students select their curriculum from a dropdown: NCERT, CBSE, JEE/NEET, IGCSE, AP, IB, or College/University. This preference is stored locally and passed to the RAG system, which prioritises retrieving content from matching curriculum sources.

### 4.5 RAG Knowledge Base
The platform maintains a vector database of textbook content embedded using OpenAI's text-embedding-3-small model. Before every solve request, the system retrieves the 5 most semantically similar passages from the knowledge base and provides them as context to Claude. This grounds answers in specific curriculum material.

### 4.6 Virtual Interactive Labs
Four subject-specific virtual labs — Chemistry, Physics, Mathematics, Biology — each with 16 items, 6 actions, and subject-specific animations. Students select items (reagents, components, mathematical objects, biological specimens), choose an action, and receive a structured AI response with outcome, equation, explanation, real-world application, safety note, and a fun fact. Results are animated using Framer Motion with 14 distinct visual effect types.

### 4.7 Solution History
All solved problems are saved per user. The history page supports search by topic, filtering by subject, and bookmarking favourite solutions for revision.

### 4.8 Admin Knowledge Base Panel
An admin-only dashboard showing statistics for all ingested content by subject and curriculum, with a live retrieval tester where you can type any question and see exactly which chunks would be retrieved and their similarity scores.

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│   Next.js 14 App Router · React 18 · Tailwind CSS               │
│   Framer Motion · KaTeX · React Markdown                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────────┐
│                    SERVER (Vercel Edge / Node.js)                 │
│                                                                   │
│   Next.js API Routes                                              │
│   ├── /api/solve          → RAG retrieval + Claude streaming      │
│   ├── /api/lab/react      → Virtual lab AI responses             │
│   ├── /api/subscriptions  → Stripe Checkout + Portal             │
│   ├── /api/webhooks/stripe→ Payment event processing             │
│   └── /api/cron           → Monthly usage reset                  │
│                                                                   │
│   Middleware (Edge)                                               │
│   └── Auth check · Rate limiting · Plan gates · Security headers  │
└──────┬──────────────────┬──────────────────┬────────────────────┘
       │                  │                  │
┌──────▼──────┐   ┌───────▼──────┐   ┌──────▼──────────────────┐
│  Supabase   │   │ Anthropic API│   │      OpenAI API          │
│             │   │              │   │                           │
│ PostgreSQL  │   │ claude-       │   │ text-embedding-3-small   │
│ pgvector    │   │ sonnet-4      │   │ (embeddings only)        │
│ Auth        │   │ (streaming)   │   │                          │
│ Storage     │   └──────────────┘   └──────────────────────────┘
└─────────────┘
```

### 5.2 Request Flow — Problem Solver

```
Student submits question
        │
        ▼
Middleware: verify JWT session
        │
        ▼
apiGuard(): rate limit check → plan quota check
        │
        ▼
validateSolvePayload(): sanitise and validate all inputs
        │
        ▼
RAG Retrieval:
  1. Embed question with OpenAI text-embedding-3-small
  2. Search knowledge_chunks table via pgvector cosine similarity
  3. Return top 5 matching textbook passages
        │
        ▼
Build Claude prompt:
  system: subject-specific instructions + step format
  user:   [retrieved context] + [student question] + [image if any]
        │
        ▼
Claude streams response token by token
        │
        ▼
SSE stream sent to browser → MathRenderer displays with KaTeX
        │
        ▼
On completion: save to problems table + increment usage counter
```

---

## 6. Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2.35 | Framework — App Router, SSR, API routes |
| React | 18.3.1 | UI library |
| TypeScript | 5.8.3 | Type safety throughout |
| Tailwind CSS | 3.4.19 | Utility-first styling |
| Framer Motion | 11.18.2 | Animations — lab effects, page transitions |
| KaTeX | 0.16.11 | Mathematical equation rendering |
| react-markdown | 9.0.1 | Markdown → HTML for solutions |
| remark-math | 6.0.0 | Parse LaTeX in markdown |
| rehype-katex | 7.0.1 | Render LaTeX via KaTeX |
| react-dropzone | 14.2.3 | Drag-and-drop photo upload |
| react-hot-toast | 2.4.1 | User notifications |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js API Routes | 14.2.35 | REST endpoints, SSE streaming |
| @anthropic-ai/sdk | 0.98.0 | Claude AI integration |
| openai | 6.39.0 | Embeddings for RAG |
| @supabase/supabase-js | 2.106.2 | Database, auth, storage |
| @supabase/ssr | 0.10.3 | Server-side Supabase auth |
| stripe | 16.12.0 | Payment processing |
| resend | 3.5.0 | Transactional email |
| pdf-parse | 1.1.1 | PDF text extraction for ingestion |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Hosting, CDN, serverless functions, cron jobs |
| Supabase | PostgreSQL database, authentication, file storage, pgvector |
| Anthropic | Claude AI model (claude-sonnet-4) |
| OpenAI | text-embedding-3-small for RAG embeddings |
| Stripe | Subscription billing, webhooks |
| Resend | Transactional email delivery |

---

## 7. System Design

### 7.1 Authentication Flow

Supabase GoTrue handles all authentication. The system uses `getUser()` (cryptographically verified via the Supabase Auth server) rather than `getSession()` (client-side only) for all server-side session verification. This is the secure pattern recommended by Supabase for Next.js Server Components.

Sessions are stored in HTTP-only cookies managed by `@supabase/ssr`. Access tokens are automatically refreshed by the middleware on every request.

A database trigger (`handle_new_user`) automatically creates a `profiles` row for every new user immediately after their `auth.users` entry is created. This ensures profile data is always available without a separate API call at registration.

### 7.2 Streaming Architecture

AI responses are delivered via Server-Sent Events (SSE). The `/api/solve` route creates a `ReadableStream` that:

1. Opens a streaming connection to the Anthropic API
2. Forwards each `text_delta` event as a `data: {...}` SSE chunk
3. The browser receives and renders each chunk immediately as it arrives
4. On completion, sends a `done` event with extracted metadata (topic, difficulty, key formulas)
5. Saves the complete solution to the database asynchronously

This means students see the first word of their solution within 1-2 seconds rather than waiting 10-15 seconds for the complete response.

### 7.3 Rate Limiting

A sliding window rate limiter is implemented in `src/lib/rate-limit/index.ts`. Limits are enforced per user ID at the API route level, and per IP address at the middleware level for authentication endpoints.

| Plan | API requests per minute | Auth attempts per 15 min (per IP) |
|------|------------------------|-----------------------------------|
| Free | 5 | 10 |
| Basic | 20 | 10 |
| Premium | 60 | 10 |

**Note for production:** The current implementation uses an in-memory Map. For multi-instance Vercel deployment, this should be replaced with Upstash Redis using `@upstash/ratelimit` to share state across serverless function instances.

### 7.4 Plan Enforcement

Every protected API route passes through `apiGuard()` which enforces in sequence:

1. **JWT verification** — Supabase session must be valid
2. **Profile fetch** — User's plan and usage are retrieved
3. **Rate limit** — Per-user sliding window check
4. **Feature gate** — Plan must include the requested feature (e.g. imageUpload)
5. **Quota check** — Monthly problem count must not exceed plan limit
6. **Calendar reset** — If the calendar month has rolled over, usage is reset atomically

Usage increments use a Postgres RPC function (`increment_problems_used`) to perform atomic updates, preventing race conditions when concurrent requests arrive.

---

## 8. Database Schema

All tables use Supabase PostgreSQL with Row Level Security (RLS) enabled.

### 8.1 Tables

**profiles** — Extends `auth.users`. Stores plan, usage counters, and Stripe customer ID.
```
id                uuid (FK → auth.users)
username          text unique
full_name         text
role              text (student | teacher | admin)
problems_used     int  (reset monthly)
experiments_run   int  (reset monthly)
usage_reset_at    timestamptz
plan              text (free | basic | premium)
stripe_customer_id text unique
```

**subscriptions** — Mirrors Stripe subscription data, updated via webhook.
```
id                    text (Stripe subscription ID, primary key)
user_id               uuid (FK → profiles)
status                text (active | trialing | canceled | past_due)
plan                  text (basic | premium)
billing_interval      text (month | year)
current_period_end    timestamptz
cancel_at_period_end  boolean
```

**problems** — Every AI-solved problem, one row per solve.
```
id                uuid
user_id           uuid (FK → profiles)
subject           text (mathematics | physics | chemistry | biology | general)
input_type        text (text | image | pdf)
input_text        text
file_url          text
solution_markdown text
topic             text
difficulty        text (easy | medium | hard | expert)
key_formulas      text[]
processing_time_ms int
```

**experiments** — Virtual lab history.
```
id        uuid
user_id   uuid (FK → profiles)
subject   text
inputs    text[]
equipment text[]
action    text
result    jsonb
```

**knowledge_chunks** — RAG vector store. Each row is one chunk of textbook content.
```
id           uuid
subject      text
curriculum   text  (NCERT | CBSE | IGCSE | AP | IB | OpenStax)
source_title text
chapter      text
content      text
embedding    vector(1536)
metadata     jsonb
```

**ingestion_log** — Tracks which textbooks have been loaded, prevents duplicate ingestion.
```
id           uuid
source_title text unique
subject      text
curriculum   text
chunks_count int
ingested_at  timestamptz
```

### 8.2 Row Level Security Policies

Every table has RLS enabled. The general pattern is:
- Users can only SELECT, INSERT, UPDATE, DELETE their own rows (`auth.uid() = user_id`)
- The service role client (used only in webhooks and cron jobs) bypasses RLS
- `knowledge_chunks` is publicly readable (educational content) but only writable by the service role

### 8.3 Key Database Functions

**`handle_new_user()`** — Trigger function that fires after every `auth.users` INSERT. Creates the corresponding `profiles` row automatically.

**`increment_problems_used(user_id)`** — Atomic counter increment. Called after every successful solve to avoid race conditions.

**`match_knowledge_chunks(query_embedding, match_subject, ...)`** — pgvector similarity search function. Returns the top N chunks ordered by cosine similarity to the query embedding, filtered by subject and optionally by curriculum.

**`reset_monthly_usage()`** — Called by the monthly cron job. Resets `problems_used` and `experiments_run` for all users whose `usage_reset_at` is in a previous month.

---

## 9. AI Integration

### 9.1 Model

All problem solving uses **claude-sonnet-4-20250514** via the Anthropic API. This model was chosen for:
- Strong mathematical reasoning
- Vision capability (reads images of handwritten or printed problems)
- Excellent instruction following (consistently returns structured output)
- Streaming support (allows real-time delivery to the student)

### 9.2 System Prompt Design

The system prompt is constructed dynamically based on subject and whether RAG context is available. Key design decisions:

**LaTeX instructions are for Claude, not the student.** The prompt instructs Claude to wrap all mathematical expressions in LaTeX (`$...$` for inline, `$$...$$` for display). Students never see this syntax — they see rendered equations via KaTeX.

**Strict output format.** The prompt specifies exact section headers with emoji markers (`## 🎯 What We're Finding`, `## ✏️ Step-by-Step Solution`, etc.). This ensures consistent structure across all solutions and maps cleanly to the MathRenderer component.

**Plain English mandate.** The prompt explicitly instructs Claude to write as if explaining to a friend, avoid unnecessary jargon, and show every step of arithmetic. This is critical for the target age group (13+).

**RAG grounding instruction.** When context is available, the prompt adds: *"You MUST use this material to ground your solution. Match the notation, method, and terminology from the reference material."*

### 9.3 Virtual Lab Prompts

Each subject has a separate system prompt for the virtual lab that instructs Claude to respond only with a JSON object containing: `outcome`, `equation`, `explanation`, `realWorldUse`, `safetyWarning`, `visualEffect`, and `funFact`. The `visualEffect` field is validated against an allowlist per subject before being passed to the animation system.

### 9.4 Claude API Usage Estimate

At 1,000 daily active users solving 3 problems each:
- Average input tokens per request: ~2,000 (system prompt + context + question)
- Average output tokens per request: ~800 (full step-by-step solution)
- Daily token consumption: ~8.4 million tokens
- Estimated daily cost: ~$12–15 USD at current Sonnet pricing

---

## 10. RAG Knowledge System

### 10.1 Overview

RAG (Retrieval-Augmented Generation) grounds Claude's answers in specific textbook content rather than general training data. The result is curriculum-aligned solutions that use the same notation, method, and terminology the student has encountered in class.

### 10.2 Ingestion Pipeline

The ingestion script (`scripts/ingest.ts`) processes PDF and plain text source documents:

1. **Text extraction** — PDFs are parsed using `pdf-parse`. Plain text files are read directly.
2. **Chunking** — Text is split into ~800 character chunks with 150 character overlap using `RecursiveCharacterTextSplitter`. Chunk boundaries prefer sentence endings over mid-sentence splits.
3. **Embedding** — Each chunk is embedded using OpenAI's `text-embedding-3-small` model, producing a 1,536-dimensional vector.
4. **Storage** — Chunks are inserted into `knowledge_chunks` in batches of 20. An `ingestion_log` entry prevents duplicate ingestion on subsequent runs.

**Ingestion cost estimate:**
- 12 NCERT textbooks (~4,000 chunks total): approximately $0.08 USD one-time
- Formula sheets and worked examples (~100 chunks): approximately $0.002 USD one-time

### 10.3 Retrieval

At query time:
1. The student's question is embedded with the same OpenAI model
2. A pgvector cosine similarity search finds the 5 most relevant chunks
3. A similarity threshold of 0.62 filters out weakly matching results
4. Retrieved chunks are formatted into a context block with source citations
5. The context block is prepended to the user's message in Claude's prompt

If retrieval fails or returns no results above the threshold, the system gracefully degrades — Claude answers from general training without context, and the student gets a correct answer without curriculum alignment.

### 10.4 pgvector Index

The `knowledge_chunks` table uses an IVFFlat index for approximate nearest-neighbour search:

```sql
create index on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

IVFFlat is chosen over exact search for performance at scale. The `lists = 100` setting is appropriate for a corpus of ~4,000–10,000 chunks and should be increased to `sqrt(row_count)` as the knowledge base grows.

### 10.5 Supported Curricula

| Curriculum | Region | Source |
|-----------|--------|--------|
| NCERT | India | ncert.nic.in (free, open license) |
| CBSE | India | ncert.nic.in (free, open license) |
| JEE / NEET | India | Past papers + formula sheets |
| OpenStax | USA / Global | openstax.org (CC-licensed, free) |
| IGCSE | Global | MIT OCW supplementary material |
| AP | USA | OpenStax College Physics / Calculus |
| IB | Global | OpenStax supplementary |

---

## 11. Security Architecture

### 11.1 Authentication Security

- All server-side session verification uses `supabase.auth.getUser()` which validates the JWT against the Supabase Auth server. The client-side `getSession()` is never used for security decisions.
- Sessions are stored in HTTP-only cookies (not localStorage), preventing XSS-based session theft.
- The Supabase service role key is used only in webhook handlers and cron jobs — never exposed to the client bundle or prefixed with `NEXT_PUBLIC_`.

### 11.2 Input Validation

All API inputs are validated before reaching the database or AI:

- **Subject** — allowlisted enum
- **Input type** — allowlisted enum (text | image | pdf)
- **Text** — maximum 4,000 characters, stripped of HTML tags and `javascript:` protocols
- **File** — MIME type allowlist, approximate size check via base64 length
- **Lab inputs** — array length limit, per-item string length limit
- **Subscription plan** — allowlisted enum

### 11.3 Payment Security

| Concern | Implementation |
|---------|---------------|
| Webhook forgery | Stripe signature verified via `stripe.webhooks.constructEvent()` before any database write |
| Duplicate charges | Idempotency keys on all Stripe Checkout session creation |
| Secret key exposure | `STRIPE_SECRET_KEY` server-only, never in client bundle |
| Plan state | Always updated from Stripe webhook, never from client-side claims |
| Customer portal | Redirects to Stripe-hosted portal, card data never touches our servers |

### 11.4 HTTP Security Headers

Applied to all routes via `next.config.mjs`:

| Header | Value | Protection |
|--------|-------|-----------|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS |
| `Content-Security-Policy` | See config | XSS, code injection |
| `Permissions-Policy` | Disables camera, mic, geolocation | Browser feature lockdown |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |

### 11.5 Database Security

- Row Level Security is enabled on every table
- Users can only access rows where `user_id = auth.uid()`
- `knowledge_chunks` is publicly readable (no personal data) but only writable by the service role
- All queries use Supabase's parameterised query builder — no raw SQL string concatenation
- Usage counters use PostgreSQL atomic increment functions to prevent race conditions

---

## 12. API Reference

### Public Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | None | Handled by Supabase Auth |
| `POST` | `/api/auth/login` | None | Handled by Supabase Auth |
| `GET`  | `/api/auth/callback` | None | OAuth redirect handler |

### Protected Endpoints (JWT required)

| Method | Endpoint | Plan Required | Description |
|--------|----------|--------------|-------------|
| `POST` | `/api/solve` | Free+ | Stream AI solution (SSE) |
| `POST` | `/api/lab/react` | Basic+ | Virtual lab AI response |
| `POST` | `/api/subscriptions/create` | Any | Create Stripe Checkout session |
| `POST` | `/api/subscriptions/portal` | Paid | Open Stripe Customer Portal |
| `POST` | `/api/admin/test-retrieval` | Admin | Test RAG retrieval quality |

### Internal Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/webhooks/stripe` | Stripe signature | Process payment events |
| `GET`  | `/api/cron/reset-usage` | CRON_SECRET header | Monthly usage reset |

### POST /api/solve — Request Body

```json
{
  "subject":    "physics",
  "inputType":  "text",
  "text":       "A ball is dropped from 45m. Time to hit the ground?",
  "curriculum": "NCERT"
}
```

For image input:
```json
{
  "subject":    "mathematics",
  "inputType":  "image",
  "fileBase64": "base64encodedstring...",
  "mimeType":   "image/jpeg",
  "curriculum": "CBSE"
}
```

### POST /api/solve — SSE Response Stream

```
data: {"type":"delta","content":"## 🎯 What We're Finding\n"}
data: {"type":"delta","content":"We need to find the time..."}
...
data: {"type":"done","metadata":{"topic":"Free Fall","difficulty":"easy","keyFormulas":["s = ½gt²"],"processingTimeMs":3241}}
```

---

## 13. Subscription Model

### Plans

| Feature | Free | Basic ($9/mo) | Premium ($19/mo) |
|---------|------|--------------|-----------------|
| Problems per month | 5 | 150 | Unlimited |
| Text input | ✓ | ✓ | ✓ |
| Photo upload | ✗ | ✓ | ✓ |
| PDF upload | ✗ | ✗ | ✓ |
| Virtual Labs | ✗ | ✓ | ✓ |
| Solution history | 3 days | 90 days | Unlimited |
| Priority processing | ✗ | ✗ | ✓ |
| Export PDF | ✗ | ✗ | ✓ |
| 7-day free trial | ✗ | ✓ | ✓ |

Annual pricing saves approximately 30%: Basic $79/yr, Premium $159/yr.

### Billing Architecture

1. User clicks upgrade → POST `/api/subscriptions/create`
2. Server creates a Stripe Checkout session with idempotency key
3. User completes payment on Stripe-hosted checkout page
4. Stripe fires `customer.subscription.created` webhook
5. Webhook handler verifies Stripe signature, updates `subscriptions` and `profiles` tables
6. User's `plan` field in `profiles` updates to `basic` or `premium`
7. All subsequent requests to `apiGuard()` see the new plan immediately

Cancellations follow the same webhook path via `customer.subscription.deleted`.

---

## 14. File Structure

```
solvr/
├── middleware.ts                    Auth + rate limit + plan gates (Edge runtime)
├── next.config.mjs                  Security headers, image domains
├── vercel.json                      Cron job schedule
├── tailwind.config.ts               Design tokens, custom animations
│
├── supabase/migrations/
│   ├── 001_initial.sql              Core schema, RLS, triggers, storage bucket
│   └── 002_rag_knowledge_base.sql   pgvector, knowledge_chunks, match function
│
├── scripts/
│   └── ingest.ts                    PDF ingestion pipeline (runs outside Next.js)
│
├── textbooks/
│   ├── formulas/                    Formula reference sheets (plain text)
│   ├── worked-examples/             Worked problem sets (plain text)
│   ├── ncert/                       NCERT PDF textbooks (not in git)
│   └── openstax/                    OpenStax PDF textbooks (not in git)
│
└── src/
    ├── types/index.ts               Shared TypeScript interfaces
    │
    ├── app/
    │   ├── layout.tsx               Root layout, fonts, KaTeX CSS, toast provider
    │   ├── page.tsx                 Landing page with demo widget
    │   ├── globals.css              Tailwind base + KaTeX dark theme overrides
    │   ├── not-found.tsx            404 page
    │   ├── global-error.tsx         Global error boundary
    │   │
    │   ├── pricing/page.tsx         Pricing page with billing toggle
    │   │
    │   ├── auth/
    │   │   ├── login/               Login page (Suspense wrapped)
    │   │   ├── register/            Register page (Suspense wrapped)
    │   │   └── callback/route.ts    OAuth redirect handler
    │   │
    │   ├── dashboard/
    │   │   ├── layout.tsx           Protected layout (server-side auth check)
    │   │   ├── page.tsx             Dashboard home (usage stats, recent problems)
    │   │   ├── solve/page.tsx       Problem solver (main feature)
    │   │   ├── history/page.tsx     Solution history with search and bookmarks
    │   │   ├── settings/            Subscription management
    │   │   ├── lab/                 Virtual lab subject selection and rooms
    │   │   └── admin/page.tsx       Knowledge base stats (admin only)
    │   │
    │   └── api/
    │       ├── solve/route.ts       RAG + streaming solver (main AI endpoint)
    │       ├── lab/react/route.ts   Virtual lab AI endpoint
    │       ├── subscriptions/       Stripe Checkout and Portal
    │       ├── webhooks/stripe/     Payment event handler
    │       ├── admin/               Admin tooling
    │       └── cron/                Scheduled jobs
    │
    ├── components/
    │   ├── MathRenderer.tsx         KaTeX + markdown with dark theme styling
    │   ├── CurriculumSelector.tsx   Curriculum dropdown with localStorage persistence
    │   ├── landing/
    │   │   └── DemoSolver.tsx       Landing page interactive demo widget
    │   └── dashboard/
    │       └── Sidebar.tsx          Navigation sidebar with usage meter
    │
    └── lib/
        ├── api-guard.ts             Auth + rate limit + quota in one call
        ├── rate-limit/index.ts      Sliding window rate limiter
        ├── validate/index.ts        Input validation for all API surfaces
        ├── email.ts                 Resend transactional email templates
        ├── utils.ts                 Shared utilities, subject config, file helpers
        ├── anthropic/
        │   ├── solver.ts            RAG-enhanced streaming solver
        │   ├── rag.ts               Retrieval: embed → pgvector → context block
        │   └── lab-prompts.ts       Virtual lab system prompts per subject
        ├── openai/client.ts         Lazy OpenAI singleton
        ├── stripe/
        │   ├── client.ts            Lazy Stripe singleton
        │   └── plans.ts             Plan config (single source of truth)
        └── supabase/
            ├── client.ts            Browser Supabase client
            └── server.ts            Server Supabase client + service role client
```

---

## 15. Setup and Installation

### Prerequisites
- Node.js 18 or higher
- A Supabase project (free tier sufficient for development)
- An Anthropic API key
- An OpenAI API key (for RAG embeddings)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/solvr-ai.git
cd solvr-ai

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Configure environment
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY

# 4. Push database schema
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# 5. Run development server
npm run dev
# → http://localhost:3000
```

### Loading RAG Content

```bash
# Ingest formula sheets immediately (no PDFs needed)
npm run ingest

# After downloading NCERT PDFs to textbooks/ncert/:
npm run ingest:physics
npm run ingest:maths
npm run ingest:chem
npm run ingest:bio

# Check what's loaded
npm run ingest:stats
```

### Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=

# Required for payments (add when ready)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_BASIC_MONTHLY_PRICE_ID=
STRIPE_BASIC_YEARLY_PRICE_ID=
STRIPE_PREMIUM_MONTHLY_PRICE_ID=
STRIPE_PREMIUM_YEARLY_PRICE_ID=

# Optional
RESEND_API_KEY=
CRON_SECRET=
```

---

## 16. Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# Project → Settings → Environment Variables
```

The `vercel.json` file configures a monthly cron job to reset usage counters on the 1st of each month at midnight UTC.

### Stripe Webhook Setup

1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events to subscribe:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### Post-Deployment Checklist

- [ ] Email verification enabled in Supabase Auth settings
- [ ] Google OAuth configured with production redirect URL
- [ ] Stripe in live mode (not test mode)
- [ ] All environment variables set in Vercel
- [ ] Custom domain configured
- [ ] Supabase Auth redirect URLs include production domain

---

## 17. Future Roadmap

### Near Term (1–3 months)
- **Mobile responsive UI** — Full responsive redesign for phone-first usage
- **Sentry error monitoring** — Real-time error tracking and alerting
- **Upstash Redis rate limiting** — Shared state for multi-instance deployment
- **PDF export** — Export solutions as formatted PDF for Premium users
- **Password reset flow** — Self-service password recovery

### Medium Term (3–6 months)
- **Teacher dashboard** — Class management, assign problems, view student progress
- **Shareable solutions** — Public links for solutions to share with classmates
- **More curricula** — Cambridge A-Level, Edexcel, Maharashtra Board, Tamil Nadu Board
- **Hindi language support** — Solutions in Hindi for broader India reach
- **PostHog analytics** — User behaviour tracking for product decisions

### Long Term (6–12 months)
- **Mobile apps** — React Native iOS and Android apps
- **Offline mode** — Cache recent solutions for use without internet
- **Practice mode** — Generate similar problems for practice after solving
- **School partnerships** — Bulk licensing for schools and coaching institutes
- **Exam-specific modes** — JEE, NEET, UPSC specific solution formats and strategies

---

## About the Developer

Solvr AI was designed and built as a solo project from Nagaland, India. The motivation came from observing that students in Northeast India face the same STEM challenges as students globally, but have far less access to quality tutoring resources due to geography and cost.

The goal is to build a product that feels like having a patient, knowledgeable tutor available at any time — one that explains the thinking, not just the answer.

---

*Documentation version 1.0.0 — May 2026*
