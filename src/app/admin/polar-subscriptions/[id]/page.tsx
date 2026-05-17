import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getPolarSubscription } from '@/server/admin/polar-subscription'
import { PolarSubscriptionStatusBadge } from '../../_components/polar-subscription-status-badge'
import { RefetchButton } from './refetch-button'

function formatDate(value: Date | null): string {
  return value != null ? format(value, 'yyyy-MM-dd HH:mm:ss') : '—'
}

export default async function PolarSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sub = await getPolarSubscription(id)
  if (sub == null) {
    notFound()
  }

  return (
    <div className='p-6'>
      <Link
        href='/admin/polar-subscriptions'
        className='text-sm text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100'
      >
        ← Back to list
      </Link>
      <div className='mt-2 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <h1 className='text-xl font-semibold text-zinc-900 dark:text-zinc-50'>
            {sub.polarSubscriptionId}
          </h1>
          <PolarSubscriptionStatusBadge status={sub.status} />
        </div>
        <RefetchButton polarSubscriptionRowId={sub.id} />
      </div>

      <dl className='mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm'>
        <dt className='text-zinc-500 dark:text-zinc-400'>ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {sub.id}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Customer ID</dt>
        <dd className='font-mono text-xs text-zinc-900 dark:text-zinc-100'>
          {sub.polarCustomerId}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Billing Email</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {sub.billingEmail.length > 0 ? sub.billingEmail : '—'}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Seats</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>{sub.seats ?? '—'}</dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Period Start</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.currentPeriodStart)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Period End</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.currentPeriodEnd)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Trial Start</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.trialStart)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Trial End</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.trialEnd)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>
          Cancel At Period End
        </dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {sub.cancelAtPeriodEnd ? 'yes' : 'no'}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Canceled At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.canceledAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Started At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.startedAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Ends At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.endsAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Ended At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.endedAt)}
        </dd>
        <dt className='text-zinc-500 dark:text-zinc-400'>Modified At</dt>
        <dd className='text-zinc-900 dark:text-zinc-100'>
          {formatDate(sub.modifiedAt)}
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

      {sub.metadata != null && (
        <>
          <h2 className='mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300'>
            Metadata
          </h2>
          <pre className='mt-2 overflow-x-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'>
            <code>{JSON.stringify(sub.metadata, null, 2)}</code>
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
    </div>
  )
}
