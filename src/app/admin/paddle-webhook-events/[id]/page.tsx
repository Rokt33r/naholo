import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getPaddleWebhookEvent } from '@/server/admin/paddle-webhook-event'

export default async function PaddleWebhookEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getPaddleWebhookEvent(id)
  if (event == null) {
    notFound()
  }

  return (
    <div className='p-6'>
      <Link
        href='/admin/paddle-webhook-events'
        className='text-sm text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100'
      >
        ← Back to list
      </Link>
      <h1 className='mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
        {event.eventType}
      </h1>
      <dl className='mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm'>
        <dt className='text-zinc-500 dark:text-zinc-400'>ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {event.id}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Event ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {event.eventId}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Event Type</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>{event.eventType}</dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Occurred At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {format(event.occurredAt, 'yyyy-MM-dd HH:mm:ss')}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Created At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {format(event.createdAt, 'yyyy-MM-dd HH:mm:ss')}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Transaction ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {event.paddleTransactionId ?? '—'}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Subscription ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {event.paddleSubscriptionId != null ? (
            <Link
              href={`/admin/paddle-subscriptions?paddleSubscriptionId=${encodeURIComponent(event.paddleSubscriptionId)}`}
              className='hover:underline'
            >
              {event.paddleSubscriptionId}
            </Link>
          ) : (
            '—'
          )}
        </dd>
      </dl>
      <h2 className='mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
        Payload
      </h2>
      <pre className='mt-2 overflow-x-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'>
        <code>{JSON.stringify(event.payload, null, 2)}</code>
      </pre>
    </div>
  )
}
