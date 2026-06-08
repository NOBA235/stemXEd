// Next.js 15: params is now a Promise — must be awaited
import { notFound } from 'next/navigation'
import LabClient    from './LabClient'

const VALID = ['chemistry', 'physics', 'mathematics', 'biology']

// Next.js 15 async params pattern
export default async function LabSubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject } = await params
  if (!VALID.includes(subject)) notFound()
  return <LabClient subjectId={subject} />
}

export function generateStaticParams() {
  return [
    { subject: 'chemistry'   },
    { subject: 'physics'     },
    { subject: 'mathematics' },
    { subject: 'biology'     },
  ]
}
