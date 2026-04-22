import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useOperationStream(
  projectSlug: string,
  operationNumber: number,
): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const url = `/api/projects/${projectSlug}/operations/${operationNumber}/stream`
    const eventSource = new EventSource(url)

    console.log('config..event stream ')
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as { type: string }
      console.log(event.data)

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
        case 'objectives-changed':
          queryClient.invalidateQueries({
            queryKey: ['objectives', operationNumber],
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
        queryKey: ['objectives', operationNumber],
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
