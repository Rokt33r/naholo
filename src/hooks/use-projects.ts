import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'

export type {
  Project,
  ProjectWorkerInfo,
  ProjectWithWorker,
} from 'naholo-api/types'

import type { ProjectWithWorker } from 'naholo-api/types'

export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'withWorker'],
    queryFn: () =>
      fetcher<ProjectWithWorker[]>(
        '/api/projects?with=projectWorkerOfCurrentUser',
      ),
  })
}
