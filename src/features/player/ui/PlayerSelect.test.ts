import { describe, expect, it } from 'vitest'
import { filterPlayerSelectOptions } from './playerSelectFilter'

describe('filterPlayerSelectOptions', () => {
  it('returns options whose labels include the query', () => {
    const options = [
      { value: 'humanities', label: 'คณะมนุษยศาสตร์' },
      { value: 'medicine', label: 'คณะแพทยศาสตร์' },
    ]

    expect(filterPlayerSelectOptions(options, 'แพทย์')).toEqual([
      { value: 'medicine', label: 'คณะแพทยศาสตร์' },
    ])
  })
})
