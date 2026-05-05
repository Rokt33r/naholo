import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getPaddleSubscription } from '@/server/admin/paddle-subscription'
import { PaddleSubscriptionStatusBadge } from '../../_components/paddle-subscription-status-badge'
import { RefetchButton } from './refetch-button'

function formatDate(value: Date | null): string {
  return value != null ? format(value, 'yyyy-MM-dd HH:mm:ss') : '—'
}

export default async function PaddleSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sub = await getPaddleSubscription(id)
  if (sub == null) {
    notFound()
  }

  return (
    <div className='p-6'>
      <Link
        href='/admin/paddle-subscriptions'
        className='text-sm text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100'
      >
        ← Back to list
      </Link>
      <div className='mt-2 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
            {sub.paddleSubscriptionId}
          </h1>
          <PaddleSubscriptionStatusBadge status={sub.status} />
        </div>
        <RefetchButton paddleSubscriptionRowId={sub.id} />
      </div>

      <dl className='mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm'>
        <dt className='text-zinc-500 dark:text-zinc-400'>ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {sub.id}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Customer ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {sub.paddleCustomerId}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Billing Email</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {sub.billingEmail.length > 0 ? sub.billingEmail : '—'}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Seats</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>{sub.seatQuantity}</dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Period Start</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.currentPeriodStart)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Period End</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.currentPeriodEnd)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Trial Ends At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.trialEndsAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Cancel At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.cancelAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Canceled At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.canceledAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Last Event</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.lastEventOccurredAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Created At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.createdAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Updated At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.updatedAt)}
        </dd>
      </dl>

      {sub.customData != null && (
        <>
          <h2 className='mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
            Custom Data
          </h2>
          <pre className='mt-2 overflow-x-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'>
            <code>{JSON.stringify(sub.customData, null, 2)}</code>
          </pre>
        </>
      )}

      <h2 className='mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
        Linked Project Subscription
      </h2>
      {sub.linkedProjectSubscription != null ? (
        <div className='mt-2 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800'>
          <Link
            href={`/admin/project-subscriptions/${sub.linkedProjectSubscription.id}`}
            className='text-zinc-900 hover:underline dark:text-zinc-100'
          >
            {sub.linkedProjectSubscription.projectName}{' '}
            <span className='text-zinc-500 dark:text-zinc-400'>
              ({sub.linkedProjectSubscription.projectSlug})
            </span>
          </Link>
        </div>
      ) : (
        <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
          (no project linked)
        </p>
      )}

      <h2 className='mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
        Recent Webhook Events
      </h2>
      <div className='mt-2 overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400'>
              <th className='pb-2 pr-4 font-medium'>Occurred</th>
              <th className='pb-2 pr-4 font-medium'>Event Type</th>
              <th className='pb-2 font-medium'>Event ID</th>
            </tr>
          </thead>
          <tbody>
            {sub.recentEvents.map((event) => (
              <tr
                key={event.id}
                className='border-b border-zinc-100 dark:border-zinc-800/50'
              >
                <td className='py-2 pr-4 text-zinc-500 dark:text-zinc-400'>
                  <Link
                    href={`/admin/paddle-webhook-events/${event.id}`}
                    className='hover:underline'
                  >
                    {format(event.occurredAt, 'yyyy-MM-dd HH:mm:ss')}
                  </Link>
                </td>
                <td className='py-2 pr-4 text-zinc-900 dark:text-zinc-100'>
                  <Link
                    href={`/admin/paddle-webhook-events/${event.id}`}
                    className='hover:underline'
                  >
                    {event.eventType}
                  </Link>
                </td>
                <td className='py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400'>
                  {event.eventId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
