import { describe, expect, it } from 'vitest'
import {
  commitHistory,
  createHistory,
  redoHistory,
  undoHistory,
} from './draftHistory'

describe('BO draft history', () => {
  it('undoes and redoes edits without changing earlier snapshots', () => {
    const start = createHistory({ title: 'เดิม' })
    const edited = commitHistory(start, { title: 'แก้แล้ว' })
    expect(edited.past).toEqual([{ title: 'เดิม' }])
    expect(undoHistory(edited).present).toEqual({ title: 'เดิม' })
    expect(redoHistory(undoHistory(edited)).present).toEqual({
      title: 'แก้แล้ว',
    })
    expect(start.present).toEqual({ title: 'เดิม' })
  })

  it('clears redo after a new edit and ignores unchanged drafts', () => {
    const start = createHistory({ title: 'เดิม' })
    const edited = commitHistory(start, { title: 'แก้แล้ว' })
    const undone = undoHistory(edited)
    const changed = commitHistory(undone, { title: 'อีกแบบ' })
    expect(changed.future).toEqual([])
    expect(redoHistory(changed)).toBe(changed)
    expect(commitHistory(changed, changed.present)).toBe(changed)
  })

  it('keeps only the latest one hundred undo states', () => {
    let history = createHistory(0)
    for (let number = 1; number <= 105; number += 1) {
      history = commitHistory(history, number)
    }
    expect(history.past).toHaveLength(100)
    expect(history.past[0]).toBe(5)
  })
})
