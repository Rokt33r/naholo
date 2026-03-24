import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'

export type Project = {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

export type ProjectWorkerInfo = {
  id: string
  type: string
  name: string
  role: string
}

export type ProjectWithWorker = Project & {
  projectWorkerOfCurrentUser: ProjectWorkerInfo
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'withWorker'],
    queryFn: () =>
      fetcher<ProjectWithWorker[]>(
        '/api/projects?with=projectWorkerOfCurrentUser',
      ),
  })
}
