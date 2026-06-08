# 🔬 Solvr AI

**AI-powered STEM tutor for students aged 13 and above.**

Type or photograph any Physics, Mathematics, Chemistry, or Biology problem and get a complete step-by-step solution in seconds — with beautiful equation rendering, curriculum alignment, and a virtual interactive lab.

> Built from Nagaland, India 🇮🇳 — making quality STEM education accessible everywhere.

---

## What it does

Students type a question or upload a photo of their homework. Solvr AI:

1. Searches a curated knowledge base of NCERT, OpenStax, and other textbooks for relevant content
2. Sends that context along with the question to Claude AI
3. Streams a structured solution back in real time with every step shown
4. Renders all equations using KaTeX — properly typeset maths, not plain text

The free plan gives 5 problems per month with no credit card. Paid plans unlock photo upload, virtual labs, and unlimited problems.

---

## Live Demo

→ **[solvr.ai](https://solvr.ai)** *(coming soon)*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Math rendering | KaTeX via rehype-katex |
| Auth + Database | Supabase (PostgreSQL + GoTrue) |
| Vector search | Supabase pgvector |
| AI — solutions | Anthropic Claude (claude-sonnet-4) |
| AI — embeddings | OpenAI text-embedding-3-small |
| Payments | Stripe |
| Email | Resend |
| Deployment | Vercel |

---

## Features

- **AI Problem Solver** — streams step-by-step solutions with KaTeX math rendering
- **Photo Upload** — photograph textbook problems, Claude reads and solves them
- **RAG Knowledge Base** — answers grounded in NCERT, CBSE, IGCSE, AP, IB content
- **Curriculum Selector** — NCERT / CBSE / JEE / IGCSE / AP / IB alignment
- **Virtual Labs** — interactive Chemistry, Physics, Mathematics, Biology simulations
- **Solution History** — searchable, filterable, bookmarkable past solutions
- **Subscription Plans** — Free / Basic ($9/mo) / Premium ($19/mo)
- **Admin Panel** — knowledge base stats and retrieval quality tester

---

## Quick Start

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) project
- [Anthropic](https://console.anthropic.com) API key
- [OpenAI](https://platform.openai.com) API key (for RAG embeddings)

### Install

```bash
git clone https://github.com/yourusername/solvr-ai.git
cd solvr-ai
npm install --legacy-peer-deps
```

### Configure

```bash
cp .env.example .env.local
```

Minimum required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-xxxx
OPENAI_API_KEY=sk-xxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=any_random_string
```

### Set up database

```bash
# Install Supabase CLI
scoop install supabase   # Windows
brew install supabase/tap/supabase  # macOS

# Link and push migrations
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Loading RAG Content

The formula sheets and worked examples are included and ready to ingest immediately:

```bash
npm run ingest
```

For full textbook coverage, download NCERT PDFs from [ncert.nic.in](https://ncert.nic.in/textbook.php) into `textbooks/ncert/` then run:

```bash
npm run ingest:physics
npm run ingest:maths
npm run ingest:chem
npm run ingest:bio
```

Check what is loaded:
```bash
npm run ingest:stats
```

---

## Project Structure

```
solvr/
├── src/
│   ├── app/
│   │   ├── page.tsx                 Landing page
│   │   ├── dashboard/
│   │   │   ├── solve/               Problem solver (main feature)
│   │   │   ├── lab/[subject]/       Virtual labs
│   │   │   ├── history/             Solution history
│   │   │   ├── settings/            Subscription management
│   │   │   └── admin/               Knowledge base admin
│   │   └── api/
│   │       ├── solve/               Streaming AI solver
│   │       ├── lab/react/           Virtual lab AI
│   │       ├── subscriptions/       Stripe Checkout + Portal
│   │       └── webhooks/stripe/     Payment events
│   ├── components/
│   │   ├── MathRenderer.tsx         KaTeX equation rendering
│   │   ├── CurriculumSelector.tsx   Curriculum preference
│   │   └── landing/DemoSolver.tsx   Landing page demo widget
│   └── lib/
│       ├── anthropic/solver.ts      RAG-enhanced Claude solver
│       ├── anthropic/rag.ts         pgvector retrieval
│       ├── api-guard.ts             Auth + rate limit + quota
│       ├── rate-limit/              Sliding window rate limiter
│       ├── validate/                Input validation
│       └── stripe/plans.ts          Subscription plan config
├── supabase/migrations/
│   ├── 001_initial.sql              Core schema + RLS
│   └── 002_rag_knowledge_base.sql   pgvector knowledge base
├── scripts/
│   └── ingest.ts                    Textbook ingestion pipeline
├── textbooks/
│   ├── formulas/                    Formula reference sheets
│   └── worked-examples/             Worked problem sets
└── docs/
    └── DOCUMENTATION.md             Full technical documentation
```

---

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run type-check       # TypeScript validation

npm run ingest           # Ingest all available content
npm run ingest:stats     # Show knowledge base statistics
npm run ingest:physics   # Ingest physics content only
npm run ingest:maths     # Ingest mathematics content only
npm run ingest:chem      # Ingest chemistry content only
npm run ingest:bio       # Ingest biology content only
```

---

## Subscription Plans

| | Free | Basic | Premium |
|--|------|-------|---------|
| Price | $0 | $9/mo | $19/mo |
| Problems/month | 5 | 150 | Unlimited |
| Photo upload | — | ✓ | ✓ |
| PDF upload | — | — | ✓ |
| Virtual Labs | — | ✓ | ✓ |
| History | 3 days | 90 days | Unlimited |
| Free trial | — | 7 days | 7 days |

Annual plans save approximately 30%.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only — bypasses RLS |
| `ANTHROPIC_API_KEY` | Yes | Claude API key — server only |
| `OPENAI_API_KEY` | Yes | Embeddings for RAG — server only |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL |
| `CRON_SECRET` | Yes | Protects cron endpoints |
| `STRIPE_SECRET_KEY` | Payments | Server only |
| `STRIPE_WEBHOOK_SECRET` | Payments | Webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments | Client-safe key |
| `STRIPE_BASIC_MONTHLY_PRICE_ID` | Payments | Stripe price ID |
| `STRIPE_BASIC_YEARLY_PRICE_ID` | Payments | Stripe price ID |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Payments | Stripe price ID |
| `STRIPE_PREMIUM_YEARLY_PRICE_ID` | Payments | Stripe price ID |
| `RESEND_API_KEY` | Email | Transactional email |

---

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

Add all environment variables in Vercel dashboard under **Project → Settings → Environment Variables**.

The `vercel.json` cron job resets monthly usage counters on the 1st of each month automatically.

### Stripe Webhooks

Point `https://yourdomain.com/api/webhooks/stripe` to these events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

### Supabase Auth

Add your production domain to **Authentication → URL Configuration → Redirect URLs**:
```
https://yourdomain.com/**
```

---

## Security

- JWT verification via `supabase.auth.getUser()` on every protected route
- Row Level Security on every database table
- Stripe webhook signature verification before any database write
- Rate limiting per user and per IP for auth endpoints
- Input validation and sanitisation on all API surfaces
- 7 HTTP security headers — CSP, HSTS, X-Frame-Options, and more
- Atomic usage counters via PostgreSQL RPC functions
- No secrets in client bundle — all sensitive keys are server-only

See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for the full security architecture.

---

## Documentation

Full technical documentation including architecture diagrams, API reference, database schema, security design, and RAG system details:

→ [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)

---

## Acknowledgements

- [Anthropic](https://anthropic.com) — Claude AI
- [Supabase](https://supabase.com) — Database and auth infrastructure
- [NCERT](https://ncert.nic.in) — Free, openly licensed educational content
- [OpenStax](https://openstax.org) — CC-licensed college textbooks
- [KaTeX](https://katex.org) — Fast math rendering

---

*Built with ❤️ from Nagaland, India*
