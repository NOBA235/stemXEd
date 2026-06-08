import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Solvr AI — Snap, Upload & Solve Any STEM Problem',
    template: '%s | Solvr AI',
  },
  description:
    'AI-powered step-by-step solutions for Physics, Maths, Chemistry & Biology. Upload a photo of any problem and get instant, detailed explanations.',
  keywords: ['AI tutor', 'physics solver', 'maths solver', 'chemistry solver', 'step by step', 'homework help'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://solvr.ai',
    siteName: 'Solvr AI',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* KaTeX CSS — required for LaTeX math rendering */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66pr4hT"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-void text-white antialiased overflow-x-hidden">
        <div className="grain-overlay" />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#141424',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
