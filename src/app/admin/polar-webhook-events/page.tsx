import Link from 'next/link'
import { format } from 'date-fns'
import { z } from 'zod'
import {
  POLAR_WEBHOOK_EVENT_PAGE_SIZE,
  listPolarWebhookEvents,
} from '@/server/admin/polar-webhook-event'
import { requireAppAdmin } from '@/server/auth/permissions'

const searchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  eventType: z
    .string()
    .trim()
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .catch(null),
})

export default async function PolarWebhookEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; eventType?: string }>
}) {
  await requireAppAdmin()
  const raw = await searchParams
  const parsed = searchParamsSchema.safeParse({
    page: raw.page,
    eventType: raw.eventType ?? null,
  })
  const { page, eventType } = parsed.success
    ? parsed.data
    : { page: 1, eventType: null }

  const { rows, total } = await listPolarWebhookEvents({ page, eventType })
  const totalPages = Math.max(
    1,
    Math.ceil(total / POLAR_WEBHOOK_EVENT_PAGE_SIZE),
  )

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (eventType != null) {
      params.set('eventType', eventType)
    }
    if (nextPage > 1) {
      params.set('page', String(nextPage))
    }
    const qs = params.toString()
    return qs.length > 0
      ? `/admin/polar-webhook-events?${qs}`
      : '/admin/polar-webhook-events'
  }

  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        Polar Webhook Events
      </h1>
      <form
        action='/admin/polar-webhook-events'
        method='get'
        className='mt-4 flex items-center gap-2'
      >
        <input
          name='eventType'
          defaultValue={eventType ?? ''}
          placeholder='Filter by event type'
          className='rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
        />
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
              <th className='pb-2 pr-4 font-medium'>Event Timestamp</th>
              <th className='pb-2 pr-4 font-medium'>Event Type</th>
              <th className='pb-2 pr-4 font-medium'>Webhook Event ID</th>
              <th className='pb-2 font-medium'>Data ID</th>
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
                    href={`/admin/polar-webhook-events/${row.id}`}
                    className='hover:underline'
                  >
                    {format(row.eventTimestamp, 'yyyy-MM-dd HH:mm:ss')}
                  </Link>
                </td>
                <td className='py-2 pr-4 text-zinc-900 dark:text-zinc-100'>
                  <Link
                    href={`/admin/polar-webhook-events/${row.id}`}
                    className='hover:underline'
                  >
                    {row.eventType}
                  </Link>
                </td>
                <td className='py-2 pr-4 font-mono text-xs text-zinc-600 dark:text-zinc-400'>
                  {row.webhookEventId ?? '—'}
                </td>
                <td className='py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400'>
                  {row.eventDataId ?? '—'}
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
