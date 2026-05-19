import { useEffect } from 'react'
import { getClientId } from '@/lib/fetcher'
import { useInvalidateActiveProjectSubscription } from '@/hooks/use-active-project-subscription'

export function useProjectSubscriptionStream(projectSlug: string): void {
  const invalidate = useInvalidateActiveProjectSubscription(projectSlug)

  useEffect(() => {
    const clientId = getClientId()
    const url = `/api/projects/${projectSlug}/billing/stream?clientId=${clientId}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as {
        type: string
        sourceClientId?: string
      }

      if (data.sourceClientId === clientId) {
        return
      }

      if (data.type === 'project-subscription-changed') {
        invalidate()
      }
    }

    eventSource.onerror = () => {
      invalidate()
    }

    return () => {
      eventSource.close()
    }
  }, [projectSlug, invalidate])
}
