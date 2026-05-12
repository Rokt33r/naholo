import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getClientId } from '@/lib/fetcher'

export function useOperationsListStream(projectSlug: string): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const clientId = getClientId()
    const url = `/api/projects/${projectSlug}/operations/stream?clientId=${clientId}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as {
        type: string
        sourceClientId?: string
      }

      if (data.sourceClientId === clientId) {
        return
      }

      if (data.type === 'operations-list-changed') {
        queryClient.invalidateQueries({
          queryKey: ['operations', projectSlug],
        })
      }
    }

    eventSource.onerror = () => {
      queryClient.invalidateQueries({
        queryKey: ['operations', projectSlug],
      })
    }

    return () => {
      eventSource.close()
    }
  }, [projectSlug, queryClient])
}
