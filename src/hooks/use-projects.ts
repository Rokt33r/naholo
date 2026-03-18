import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'

export type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => fetcher<Project[]>('/api/projects'),
  })
}
