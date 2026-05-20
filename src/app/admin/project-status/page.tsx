'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type RecomputeResult = {
  scanned: number
  active: number
  inactive: number
  seatsExceeded: number
  durationMs: number
}

export default function ProjectStatusAdminPage() {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<RecomputeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRecompute = async () => {
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/project-status/recompute', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }
      const data = (await response.json()) as RecomputeResult
      setResult(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unknown error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className='flex flex-col gap-4 p-6'>
      <div>
        <h1 className='text-xl font-semibold'>Project Status (temp)</h1>
        <p className='mt-1 text-sm text-zinc-600 dark:text-zinc-400'>
          One-time tool. Replays <code>recomputeProjectStatus</code> over every
          project to backfill or repair <code>projects.status</code>. Delete
          this page (and its API route + sidebar entry) once the recompute has
          been run.
        </p>
      </div>

      <div>
        <Button onClick={handleRecompute} disabled={pending}>
          {pending ? 'Recomputing…' : 'Recompute all'}
        </Button>
      </div>

      {error != null ? (
        <div className='text-sm text-red-600 dark:text-red-400'>{error}</div>
      ) : null}

      {result != null ? (
        <div className='rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800'>
          <div className='font-medium'>Last run</div>
          <ul className='mt-2 space-y-1 text-zinc-700 dark:text-zinc-300'>
            <li>Scanned: {result.scanned}</li>
            <li>Active: {result.active}</li>
            <li>Inactive: {result.inactive}</li>
            <li>Seats-exceeded: {result.seatsExceeded}</li>
            <li>Duration: {result.durationMs} ms</li>
          </ul>
        </div>
      ) : null}
    </div>
  )
}
