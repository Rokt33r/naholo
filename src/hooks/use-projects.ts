import { useQuery } from '@tanstack/react-query'
import { fetcher } from '@/lib/fetcher'

export type {
  Project,
  ProjectOperatorInfo,
  ProjectWithOperator,
} from 'naholo-api/types'

import type { ProjectWithOperator } from 'naholo-api/types'

export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'withOperator'],
    queryFn: () =>
      fetcher<ProjectWithOperator[]>(
        '/api/projects?with=projectOperatorOfCurrentUser',
      ),
  })
}
