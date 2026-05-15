// TEMPORARY — remove after agent-session transcript migration (OP #145) is verified in prod.
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createResponseError } from '@/lib/fetcher'

type CopyResult = {
  action: 'copy'
  copied: number
  skipped: number
  failed: number
  total: number
}

type DeleteResult = {
  action: 'delete'
  deleted: number
  failed: number
  total: number
}

export function AgentSessionTranscriptsMigrationClient() {
  const [copyResult, setCopyResult] = useState<CopyResult | null>(null)
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null)
  const [copyRunning, setCopyRunning] = useState(false)
  const [deleteRunning, setDeleteRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: 'copy' | 'delete') => {
    setError(null)
    if (action === 'copy') {
      setCopyRunning(true)
    } else {
      setDeleteRunning(true)
    }
    try {
      const response = await fetch(
        '/api/admin/agent-session-transcripts-migration',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      )
      if (!response.ok) {
        throw await createResponseError(response)
      }
      const data = await response.json()
      if (data.action === 'copy') {
        setCopyResult(data)
      } else {
        setDeleteResult(data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCopyRunning(false)
      setDeleteRunning(false)
    }
  }

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div>
        <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
          Agent-session transcript migration
        </h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Temporary page — remove after migration ships and verifies clean in
          prod.
        </p>
      </div>

      <section className='flex flex-col gap-2 rounded-md border p-4'>
        <h2 className='text-sm font-semibold'>
          Step 1 — Copy legacy <code>{'{opNumber}/{internalId}'}</code> → new{' '}
          <code>{'{operationId}/{sessionId}'}</code>
        </h2>
        <div className='flex items-center gap-3'>
          <Button onClick={() => run('copy')} disabled={copyRunning}>
            {copyRunning ? 'Running…' : 'Run copy'}
          </Button>
          {copyResult != null ? (
            <span className='text-sm text-muted-foreground tabular-nums'>
              last run: copied={copyResult.copied}, skipped={copyResult.skipped}
              , failed={copyResult.failed}, total={copyResult.total}
            </span>
          ) : null}
        </div>
      </section>

      <section className='flex flex-col gap-2 rounded-md border p-4'>
        <h2 className='text-sm font-semibold'>
          Step 2 — Delete legacy <code>{'{opNumber}/{internalId}'}</code> keys
        </h2>
        <p className='text-xs text-muted-foreground'>
          Confirm the new keys serve transcripts in prod before running.
        </p>
        <div className='flex items-center gap-3'>
          <Button
            variant='destructive'
            onClick={() => {
              if (
                window.confirm(
                  'Delete all legacy {opNumber}/{internalId} transcript objects? This cannot be undone.',
                )
              ) {
                run('delete')
              }
            }}
            disabled={deleteRunning}
          >
            {deleteRunning ? 'Running…' : 'Run delete'}
          </Button>
          {deleteResult != null ? (
            <span className='text-sm text-muted-foreground tabular-nums'>
              last run: deleted={deleteResult.deleted}, failed=
              {deleteResult.failed}, total={deleteResult.total}
            </span>
          ) : null}
        </div>
      </section>

      {error != null ? (
        <div className='rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive'>
          {error}
        </div>
      ) : null}
    </div>
  )
}
