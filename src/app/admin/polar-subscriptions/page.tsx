import Link from 'next/link'
import { format } from 'date-fns'
import { z } from 'zod'
import {
  POLAR_SUBSCRIPTION_PAGE_SIZE,
  listPolarSubscriptions,
} from '@/server/admin/polar-subscription'
import { requireAppAdmin } from '@/server/auth/permissions'
import { PolarSubscriptionStatusBadge } from '../_components/polar-subscription-status-badge'

const STATUSES = [
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
] as const

const searchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  status: z.enum(STATUSES).nullable().catch(null),
})

export default async function PolarSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  await requireAppAdmin()
  const raw = await searchParams
  const parsed = searchParamsSchema.safeParse({
    page: raw.page,
    status: raw.status != null && raw.status.length > 0 ? raw.status : null,
  })
  const { page, status } = parsed.success
    ? parsed.data
    : { page: 1, status: null }

  const { rows, total } = await listPolarSubscriptions({ page, status })
  const totalPages = Math.max(
    1,
    Math.ceil(total / POLAR_SUBSCRIPTION_PAGE_SIZE),
  )

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (status != null) {
      params.set('status', status)
    }
    if (nextPage > 1) {
      params.set('page', String(nextPage))
    }
    const qs = params.toString()
    return qs.length > 0
      ? `/admin/polar-subscriptions?${qs}`
      : '/admin/polar-subscriptions'
  }

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        Polar Subscriptions
      </h1>
      <form
        action='/admin/polar-subscriptions'
        method='get'
        className='mt-4 flex items-center gap-2'
      >
        <select
          name='status'
          defaultValue={status ?? ''}
          className='rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
        >
          <option value=''>All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type='submit'
          className='rounded border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
        >
          Filter
        </button>
      </form>
      <div className='mt-4 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
              <th className='pb-2 pr-4 font-medium'>Status</th>
              <th className='pb-2 pr-4 font-medium'>Subscription ID</th>
              <th className='pb-2 pr-4 font-medium'>Billing Email</th>
              <th className='pb-2 pr-4 font-medium'>Seats</th>
              <th className='pb-2 font-medium'>Modified</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className='border-b border-zinc-100 dark:border-zinc-800/50'
              >
                <td className='py-2 pr-4'>
                  <Link
                    href={`/admin/polar-subscriptions/${row.id}`}
                    className='hover:underline'
                  >
                    <PolarSubscriptionStatusBadge status={row.status} />
                  </Link>
                </td>
                <td className='py-2 pr-4 font-mono text-xs text-zinc-900 dark:text-zinc-100'>
                  <Link
                    href={`/admin/polar-subscriptions/${row.id}`}
                    className='hover:underline'
                  >
                    {row.polarSubscriptionId}
                  </Link>
                </td>
                <td className='py-2 pr-4 text-zinc-600 dark:text-zinc-400'>
                  {row.billingEmail.length > 0 ? row.billingEmail : '—'}
                </td>
                <td className='py-2 pr-4 text-zinc-600 dark:text-zinc-400'>
                  {row.seats ?? '—'}
                </td>
                <td className='py-2 text-zinc-500 dark:text-zinc-400'>
                  {row.modifiedAt != null
                    ? format(row.modifiedAt, 'yyyy-MM-dd HH:mm:ss')
                    : '—'}
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
