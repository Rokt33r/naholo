import Link from 'next/link'
import { format } from 'date-fns'
import { z } from 'zod'
import {
  PROJECT_SUBSCRIPTION_PAGE_SIZE,
  listProjectSubscriptions,
} from '@/server/admin/project-subscription'
import { PolarSubscriptionStatusBadge } from '../_components/polar-subscription-status-badge'

const searchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
})

export default async function ProjectSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const raw = await searchParams
  const parsed = searchParamsSchema.safeParse({ page: raw.page })
  const { page } = parsed.success ? parsed.data : { page: 1 }

  const { rows, total } = await listProjectSubscriptions({ page })
  const totalPages = Math.max(
    1,
    Math.ceil(total / PROJECT_SUBSCRIPTION_PAGE_SIZE),
  )

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (nextPage > 1) {
      params.set('page', String(nextPage))
    }
    const qs = params.toString()
    return qs.length > 0
      ? `/admin/project-subscriptions?${qs}`
      : '/admin/project-subscriptions'
  }

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        Project Subscriptions
      </h1>
      <div className='mt-4 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
              <th className='pb-2 pr-4 font-medium'>Created</th>
              <th className='pb-2 pr-4 font-medium'>Project</th>
              <th className='pb-2 pr-4 font-medium'>Polar</th>
              <th className='pb-2 font-medium'>Created By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className='border-b border-zinc-100 dark:border-zinc-800/50'
              >
                <td className='py-2 pr-4 text-zinc-500 dark:text-zinc-400'>
                  <Link
                    href={`/admin/project-subscriptions/${row.id}`}
                    className='hover:underline'
                  >
                    {format(row.createdAt, 'yyyy-MM-dd HH:mm:ss')}
                  </Link>
                </td>
                <td className='py-2 pr-4 text-zinc-900 dark:text-zinc-100'>
                  <Link
                    href={`/admin/project-subscriptions/${row.id}`}
                    className='hover:underline'
                  >
                    {row.projectName}{' '}
                    <span className='text-zinc-500 dark:text-zinc-400'>
                      ({row.projectSlug})
                    </span>
                  </Link>
                </td>
                <td className='py-2 pr-4'>
                  {row.polarSubscription != null ? (
                    <Link
                      href={`/admin/polar-subscriptions/${row.polarSubscription.rowId}`}
                      className='hover:underline'
                    >
                      <PolarSubscriptionStatusBadge
                        status={row.polarSubscription.status}
                      />
                    </Link>
                  ) : (
                    <span className='text-zinc-400 dark:text-zinc-600'>—</span>
                  )}
                </td>
                <td className='py-2 text-zinc-600 dark:text-zinc-400'>
                  {row.createdByOperatorName ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400'>
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <div className='flex items-center gap-3'>
          {page > 1 ? (
            <Link
              href={buildHref(page - 1)}
              className='hover:text-zinc-900 hover:underline dark:hover:text-zinc-100'
            >
              ← Prev
            </Link>
          ) : (
            <span className='text-zinc-300 dark:text-zinc-600'>← Prev</span>
          )}
          {page < totalPages ? (
            <Link
              href={buildHref(page + 1)}
              className='hover:text-zinc-900 hover:underline dark:hover:text-zinc-100'
            >
              Next →
            </Link>
          ) : (
            <span className='text-zinc-300 dark:text-zinc-600'>Next →</span>
          )}
        </div>
      </div>
    </div>
  )
}
