'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type RowStatus =
  | { kind: 'pending' }
  | { kind: 'skipped' }
  | { kind: 'processing' }
  | { kind: 'done'; hasStats: boolean; errorCount: number }
  | { kind: 'error'; reason: 'not_found' | 'no_transcript' | 'http' }

type Row = {
  sessionId: string
  projectSlug: string
  operationNumber: number
  selected: boolean
  status: RowStatus
}

type ListItem = {
  id: string
  sessionId: string
  projectSlug: string
  operationNumber: number
}

type ReprocessResponse =
  | { ok: true; hasStats: boolean; errorCount: number }
  | { ok: false; reason: 'not_found' | 'no_transcript' }

type Phase = 'idle' | 'loading' | 'ready' | 'running' | 'done'

export function BulkProcessDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [rows, setRows] = useState<Row[]>([])
  const stopRequestedRef = useRef(false)

  const counts = useMemo(() => {
    let selected = 0
    let processed = 0
    let errors = 0
    for (const row of rows) {
      if (row.selected) {
        selected++
      }
      if (row.status.kind === 'done' || row.status.kind === 'error') {
        processed++
      }
      if (row.status.kind === 'error') {
        errors++
      }
      if (row.status.kind === 'done' && row.status.errorCount > 0) {
        errors++
      }
    }
    return { selected, processed, errors }
  }, [rows])

  const selectAllState = useMemo<boolean | 'indeterminate'>(() => {
    if (rows.length === 0) {
      return false
    }
    const selectedCount = rows.reduce((n, row) => n + (row.selected ? 1 : 0), 0)
    if (selectedCount === 0) {
      return false
    }
    if (selectedCount === rows.length) {
      return true
    }
    return 'indeterminate'
  }, [rows])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) {
        stopRequestedRef.current = true
        if (phase === 'done') {
          router.refresh()
        }
        setPhase('idle')
        setRows([])
        stopRequestedRef.current = false
        return
      }
      void loadRows()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, router],
  )

  async function loadRows() {
    setPhase('loading')
    try {
      const response = await fetch(
        '/api/admin/agent-sessions?filter=unprocessed',
      )
      if (!response.ok) {
        toast.error(`Failed to load sessions (${response.status})`)
        setPhase('idle')
        setOpen(false)
        return
      }
      const data = (await response.json()) as { rows: ListItem[] }
      setRows(
        data.rows.map((item) => ({
          sessionId: item.sessionId,
          projectSlug: item.projectSlug,
          operationNumber: item.operationNumber,
          selected: true,
          status: { kind: 'pending' },
        })),
      )
      setPhase('ready')
    } catch (error) {
      toast.error(
        `Failed to load sessions: ${error instanceof Error ? error.message : 'unknown'}`,
      )
      setPhase('idle')
      setOpen(false)
    }
  }

  function toggleRow(sessionId: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.sessionId === sessionId ? { ...row, selected: !row.selected } : row,
      ),
    )
  }

  function toggleAll() {
    setRows((prev) => {
      const nextSelected = selectAllState !== true
      return prev.map((row) => ({ ...row, selected: nextSelected }))
    })
  }

  async function handleStart() {
    stopRequestedRef.current = false
    setPhase('running')
    const snapshot = rows.map((row) => ({ ...row }))
    setRows((prev) =>
      prev.map((row) =>
        row.selected
          ? { ...row, status: { kind: 'pending' } }
          : { ...row, status: { kind: 'skipped' } },
      ),
    )
    for (const row of snapshot) {
      if (stopRequestedRef.current) {
        break
      }
      if (!row.selected) {
        continue
      }
      setRows((prev) =>
        prev.map((r) =>
          r.sessionId === row.sessionId
            ? { ...r, status: { kind: 'processing' } }
            : r,
        ),
      )
      const status = await reprocessOne(row.sessionId)
      setRows((prev) =>
        prev.map((r) => (r.sessionId === row.sessionId ? { ...r, status } : r)),
      )
    }
    setPhase('done')
  }

  function handleStop() {
    stopRequestedRef.current = true
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type='button' variant='outline' size='sm'>
          Process unprocessed
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Process unprocessed sessions</DialogTitle>
          <DialogDescription>
            Reprocess sessions one by one. Selection is locked while running.
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300'>
          <div>
            {phase === 'loading' ? (
              <span className='text-zinc-500'>Loading…</span>
            ) : (
              <>
                <span>{counts.selected} selected</span>
                <span className='mx-2 text-zinc-400'>·</span>
                <span>
                  {counts.processed} / {rows.length} processed
                </span>
                <span className='mx-2 text-zinc-400'>·</span>
                <span>{counts.errors} errors</span>
              </>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {phase === 'running' ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleStop}
              >
                Stop
              </Button>
            ) : (
              <Button
                type='button'
                size='sm'
                onClick={handleStart}
                disabled={
                  phase !== 'ready' ||
                  rows.length === 0 ||
                  counts.selected === 0
                }
              >
                Start
              </Button>
            )}
          </div>
        </div>

        <div className='max-h-[60vh] overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800'>
          <table className='w-full text-sm'>
            <thead className='sticky top-0 bg-zinc-50 dark:bg-zinc-900'>
              <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
                <th className='px-3 py-2 font-medium'>
                  <Checkbox
                    checked={selectAllState}
                    onCheckedChange={toggleAll}
                    disabled={
                      phase === 'running' ||
                      phase === 'loading' ||
                      rows.length === 0
                    }
                    aria-label='Toggle all'
                  />
                </th>
                <th className='px-3 py-2 font-medium'>Session</th>
                <th className='px-3 py-2 font-medium'>Project / Op</th>
                <th className='px-3 py-2 font-medium'>Status</th>
              </tr>
            </thead>
            <tbody>
              {phase === 'loading' ? (
                <tr>
                  <td
                    colSpan={4}
                    className='px-3 py-4 text-center text-zinc-500'
                  >
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className='px-3 py-4 text-center text-zinc-500'
                  >
                    No unprocessed sessions.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.sessionId}
                    className='border-b border-zinc-100 dark:border-zinc-800/50'
                  >
                    <td className='px-3 py-2'>
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={() => toggleRow(row.sessionId)}
                        disabled={phase === 'running'}
                        aria-label={`Select ${row.sessionId}`}
                      />
                    </td>
                    <td className='px-3 py-2 font-mono text-xs text-zinc-900 dark:text-zinc-100'>
                      {row.sessionId}
                    </td>
                    <td className='px-3 py-2 text-zinc-600 dark:text-zinc-400'>
                      {row.projectSlug} #{row.operationNumber}
                    </td>
                    <td className='px-3 py-2'>
                      <StatusCell status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusCell({ status }: { status: RowStatus }) {
  if (status.kind === 'pending') {
    return <span className='text-zinc-500'>pending</span>
  }
  if (status.kind === 'skipped') {
    return <span className='text-zinc-400'>skipped</span>
  }
  if (status.kind === 'processing') {
    return <span className='text-blue-600 dark:text-blue-400'>processing…</span>
  }
  if (status.kind === 'done') {
    if (!status.hasStats) {
      return (
        <span className='text-amber-600 dark:text-amber-400'>
          done (no stats, {status.errorCount} errors)
        </span>
      )
    }
    return (
      <span className='text-emerald-600 dark:text-emerald-400'>
        done ({status.errorCount} errors)
      </span>
    )
  }
  return (
    <span className='text-red-600 dark:text-red-400'>
      {reasonLabel(status.reason)}
    </span>
  )
}

function reasonLabel(reason: 'not_found' | 'no_transcript' | 'http'): string {
  if (reason === 'not_found') {
    return 'not found'
  }
  if (reason === 'no_transcript') {
    return 'no transcript'
  }
  return 'request failed'
}

async function reprocessOne(sessionId: string): Promise<RowStatus> {
  try {
    const response = await fetch(
      `/api/admin/agent-sessions/${sessionId}/reprocess`,
      { method: 'POST' },
    )
    if (!response.ok && response.status !== 404) {
      return { kind: 'error', reason: 'http' }
    }
    const data = (await response.json()) as ReprocessResponse
    if (!data.ok) {
      return { kind: 'error', reason: data.reason }
    }
    return {
      kind: 'done',
      hasStats: data.hasStats,
      errorCount: data.errorCount,
    }
  } catch (error) {
    if (error instanceof Error) {
      return { kind: 'error', reason: 'http' }
    }
    return { kind: 'error', reason: 'http' }
  }
}
