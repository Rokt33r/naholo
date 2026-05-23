import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getClientId } from '@/lib/fetcher'

export function useOperationStream(
  projectSlug: string,
  operationNumber: number,
): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const clientId = getClientId()
    const url = `/api/projects/${projectSlug}/operations/${operationNumber}/stream?clientId=${clientId}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as {
        type: string
        sourceClientId?: string
      }

      // Skip events that originated from this client (self-event filtering)
      if (data.sourceClientId === clientId) {
        return
      }

      switch (data.type) {
        case 'operation-updated':
          queryClient.invalidateQueries({
            queryKey: ['operation', projectSlug, operationNumber],
          })
          break
        case 'operation-deleted':
          eventSource.close()
          queryClient.invalidateQueries({
            queryKey: ['operation', projectSlug, operationNumber],
          })
          break
        case 'tasks-changed':
          queryClient.invalidateQueries({
            queryKey: ['tasks', operationNumber],
          })
          break
        case 'logs-changed':
          queryClient.invalidateQueries({
            queryKey: ['operationLogs', operationNumber],
          })
          break
        case 'notes-changed':
          queryClient.invalidateQueries({
            queryKey: ['notes', operationNumber],
          })
          break
      }
    }

    eventSource.onerror = () => {
      queryClient.invalidateQueries({
        queryKey: ['operation', projectSlug, operationNumber],
      })
      queryClient.invalidateQueries({
        queryKey: ['tasks', operationNumber],
      })
      queryClient.invalidateQueries({
        queryKey: ['operationLogs', operationNumber],
      })
      queryClient.invalidateQueries({
        queryKey: ['notes', operationNumber],
      })
    }

    return () => {
      eventSource.close()
    }
  }, [projectSlug, operationNumber, queryClient])
}
