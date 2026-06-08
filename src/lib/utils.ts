import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Plan } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

export function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return formatDate(date)
}

export function usagePercent(used: number, limit: number): number {
  if (limit === -1) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export const PLAN_COLORS: Record<Plan, string> = {
  free:    '#90a4ae',
  basic:   '#c77dff',
  premium: '#39ff8f',
}

export const SUBJECT_CONFIG = {
  mathematics: { icon: '📐', color: '#c77dff', label: 'Mathematics' },
  physics:     { icon: '⚡', color: '#00d4ff', label: 'Physics'     },
  chemistry:   { icon: '⚗️', color: '#39ff8f', label: 'Chemistry'   },
  biology:     { icon: '🧬', color: '#ff6b35', label: 'Biology'     },
  general:     { icon: '🔬', color: '#90a4ae', label: 'General'     },
} as const

// Convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Sanitize filename for storage
export function storageKey(userId: string, filename: string): string {
  const ext  = filename.split('.').pop() || 'bin'
  const ts   = Date.now()
  return `${userId}/${ts}.${ext}`
}
