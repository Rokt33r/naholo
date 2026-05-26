import Link from 'next/link'
import { z } from 'zod'
import { listAgentSessionsByStatsErrorState } from '@/server/admin/agent-session-stats'
import { ReprocessRowButton } from './_components/reprocess-row-button'

const searchParamsSchema = z.object({
  filter: z.enum(['any', 'null']).catch('any'),
})

export default async function AgentSessionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const raw = await searchParams
  const { filter } = searchParamsSchema.parse({ filter: raw.filter ?? 'any' })

  const rows = await listAgentSessionsByStatsErrorState(filter)

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
          Agent Sessions
        </h1>
      </div>

      <div className='mt-4 flex items-center gap-2 text-sm'>
        <span className='text-zinc-500 dark:text-zinc-400'>Filter:</span>
        <FilterLink current={filter} value='any' label='any errors' />
        <FilterLink current={filter} value='null' label='clean (null)' />
      </div>

      <div className='mt-4 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
              <th className='pb-2 pr-4 font-medium'>Session ID</th>
              <th className='pb-2 pr-4 font-medium'>Project / Op</th>
              <th className='pb-2 pr-4 font-medium'>Stats</th>
              <th className='pb-2 pr-4 font-medium'># Errors</th>
              <th className='pb-2 font-medium'></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className='py-4 text-center text-zinc-500 dark:text-zinc-400'
                >
                  No rows.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className='border-b border-zinc-100 dark:border-zinc-800/50'
                >
                  <td className='py-2 pr-4 font-mono text-xs text-zinc-900 dark:text-zinc-100'>
                    {row.sessionId}
                  </td>
                  <td className='py-2 pr-4 text-zinc-600 dark:text-zinc-400'>
                    {row.projectSlug} #{row.operationNumber}
                  </td>
                  <td className='py-2 pr-4'>
                    <StatsBadge hasStats={row.hasStats} />
                  </td>
                  <td className='py-2 pr-4 text-zinc-900 dark:text-zinc-100'>
                    {row.errorCount}
                  </td>
                  <td className='py-2'>
                    <div className='flex items-center gap-3'>
                      <Link
                        href={`/api/admin/agent-sessions/${row.sessionId}/pruned-transcript`}
                        className='text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100'
                      >
                        Download pruned
                      </Link>
                      <ReprocessRowButton
                        agentSessionSessionId={row.sessionId}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterLink({
  current,
  value,
  label,
}: {
  current: 'any' | 'null'
  value: 'any' | 'null'
  label: string
}) {
  const isActive = current === value
  return (
    <Link
      href={`/admin/agent-sessions?filter=${value}`}
      className={
        isActive
          ? 'rounded bg-zinc-200 px-2 py-1 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
          : 'rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
      }
    >
      {label}
    </Link>
  )
}

function StatsBadge({ hasStats }: { hasStats: boolean }) {
  if (hasStats) {
    return (
      <span className='rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'>
        yes
      </span>
    )
  }
  return (
    <span className='rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'>
      no
    </span>
  )
}
