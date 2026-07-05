import { describe, it, expect } from 'vitest'
import { parseOperationSearch } from './operation-search'

describe('parseOperationSearch', () => {
  it('maps every token kind and keeps quoted label values intact', () => {
    const conditions = parseOperationSearch(
      'assignee:rokt33r label:bug label:"needs review" #42 blog content',
    )

    expect(conditions).toEqual({
      terms: ['blog', 'content'],
      labels: ['bug', 'needs review'],
      assignees: ['rokt33r'],
      operationNumber: '42',
    })
  })
})
