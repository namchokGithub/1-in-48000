import { describe, expect, it } from 'vitest'
import { idProblem } from './idCheck'

describe('ID check', () => {
  it('accepts a lowercase ID that no other item uses', () => {
    expect(idProblem('mali', ['nap-dow'])).toBeNull()
  })

  it('rejects a blank or badly formed ID', () => {
    expect(idProblem('', [])).toBe('ID ต้องขึ้นต้นด้วยตัวพิมพ์เล็ก a-z')
    expect(idProblem('Mali', [])).toBe('ID ต้องขึ้นต้นด้วยตัวพิมพ์เล็ก a-z')
  })

  it('rejects an ID another item already uses', () => {
    expect(idProblem('mali', ['mali'])).toBe('ID นี้ซ้ำกับรายการอื่น')
  })
})
