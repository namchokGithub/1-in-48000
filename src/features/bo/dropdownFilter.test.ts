import { describe, expect, it } from 'vitest'
import {
  SEARCH_THRESHOLD,
  filterOptionIndexes,
  isSearchable,
} from './dropdownFilter'

const options = [
  { value: '', label: 'ไม่ใช้' },
  { value: 'campus_orientation', label: 'campus_orientation' },
  { value: 'mali', label: 'มะลิ' },
  { value: 'bang_saen_beach', label: 'Bang Saen Beach' },
]

describe('dropdown filter', () => {
  it('turns search on from eight options', () => {
    expect(SEARCH_THRESHOLD).toBe(8)
    expect(isSearchable(7)).toBe(false)
    expect(isSearchable(8)).toBe(true)
  })

  it('keeps every option for an empty or blank query', () => {
    expect(filterOptionIndexes(options, '')).toEqual([0, 1, 2, 3])
    expect(filterOptionIndexes(options, '   ')).toEqual([0, 1, 2, 3])
  })

  it('matches part of the label or value, ignoring case', () => {
    expect(filterOptionIndexes(options, 'ORIENT')).toEqual([1])
    expect(filterOptionIndexes(options, 'saen')).toEqual([3])
    expect(filterOptionIndexes(options, 'bang_saen')).toEqual([3])
    expect(filterOptionIndexes(options, 'มะ')).toEqual([2])
  })

  it('returns nothing when no option matches', () => {
    expect(filterOptionIndexes(options, 'zzz')).toEqual([])
  })
})
