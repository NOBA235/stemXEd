'use client'
// ============================================================
//  MathRenderer
//  Renders markdown with full LaTeX support via KaTeX.
//  Handles:
//    Inline math:  $F = ma$  →  F = ma (inline)
//    Block math:   $$\int_0^\infty e^{-x}dx$$  →  centred display
//    Code blocks:  ```python  →  syntax highlighted
//    Tables, lists, headers, bold, etc.
// ============================================================

import ReactMarkdown from 'react-markdown'
import remarkMath    from 'remark-math'
import rehypeKatex  from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'

interface MathRendererProps {
  children: string
  /** Show a blinking cursor at the end (streaming mode) */
  streaming?: boolean
  className?: string
}

// Custom component overrides — maps markdown elements to styled JSX
const components: Components = {
  // ── Headings ────────────────────────────────────────────────────────────
  h1: ({ children }) => (
    <h1 className="text-xl font-extrabold text-white mt-6 mb-3 tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-white mt-6 mb-3 flex items-center gap-2 border-b border-white/[0.07] pb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-white/85 mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-white/70 mt-3 mb-1.5">{children}</h4>
  ),

  // ── Body text ────────────────────────────────────────────────────────────
  p: ({ children }) => (
    <p className="text-sm text-white/70 leading-relaxed mb-3">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="text-white font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-white/80 italic">{children}</em>
  ),

  // ── Lists ────────────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul className="list-none space-y-1.5 mb-3 ml-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1.5 mb-3 ml-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-white/70 flex items-start gap-2">
      <span className="text-violet mt-0.5 text-xs flex-shrink-0">▸</span>
      <span>{children}</span>
    </li>
  ),

  // ── Code ─────────────────────────────────────────────────────────────────
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className={`${className || ''} text-xs`} {...props}>
          {children}
        </code>
      )
    }
    // Inline code — but NOT math (KaTeX handles those)
    return (
      <code
        className="bg-white/[0.07] text-acid font-mono text-xs px-1.5 py-0.5 rounded border border-white/10"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="bg-[#0d0d1a] border border-white/[0.08] rounded-xl p-4 mb-4 overflow-x-auto text-xs leading-relaxed">
      {children}
    </pre>
  ),

  // ── Block quote (used for hints/notes) ──────────────────────────────────
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-violet/50 pl-4 my-3 italic text-white/55 text-sm">
      {children}
    </blockquote>
  ),

  // ── Divider ──────────────────────────────────────────────────────────────
  hr: () => <hr className="border-white/[0.08] my-5" />,

  // ── Tables ───────────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/[0.05]">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-3 py-2 text-xs font-mono text-white/50 tracking-wider border-b border-white/[0.08]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm text-white/65 border-b border-white/[0.04]">
      {children}
    </td>
  ),

  // ── Links ────────────────────────────────────────────────────────────────
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-violet underline underline-offset-2 hover:text-violet/80 transition-colors">
      {children}
    </a>
  ),
}

export default function MathRenderer({ children, streaming = false, className = '' }: MathRendererProps) {
  return (
    <div className={`math-renderer ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [rehypeKatex, {
            // KaTeX options
            throwOnError: false,         // never crash — show error marker instead
            errorColor:   '#ff3b5c',     // red error markers match our danger color
            strict:       false,         // allow some non-standard LaTeX
            trust:        false,         // don't trust HTML in LaTeX
            output:       'htmlAndMathml', // best browser compat + accessibility
          }],
          rehypeHighlight,
        ]}
        components={components}
      >
        {children}
      </ReactMarkdown>

      {/* Blinking cursor for streaming mode */}
      {streaming && (
        <span className="inline-block w-0.5 h-4 bg-acid ml-0.5 align-middle animate-[cursor-blink_0.6s_ease-in-out_infinite]" />
      )}
    </div>
  )
}
