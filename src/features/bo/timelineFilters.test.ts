import { describe, expect, it } from 'vitest'
import { matchesStoryQuery } from './timelineFilters'

const stories = [
  {
    id: 'midterm_exam',
    title: 'สอบกลางภาค',
    kind: 'main' as const,
    time: { year: 1, period: 'term1' as const },
    lines: [{ text: 'อ่านหนังสือ' }],
    choices: [{ text: 'อ่านต่อ' }],
  },
  {
    id: 'library_visit',
    title: 'ห้องสมุด',
    kind: 'conditional' as const,
    time: { year: 1, period: 'term1' as const },
    lines: [{ text: 'มะลิรออยู่' }],
    choices: [{ text: 'เข้าห้องสมุด' }],
  },
  {
    id: 'hidden_event',
    title: 'เรื่องที่ปิดไว้',
    kind: 'main' as const,
    active: false,
    time: { year: 1, period: 'term1' as const },
    lines: [{ text: 'ซ่อน' }],
    choices: [{ text: 'ซ่อน' }],
  },
]

describe('BO story search', () => {
  it('finds events by ID, title, dialogue, and choice text', () => {
    expect(matchesStoryQuery(stories[0], 'MIDTERM')).toBe(true)
    expect(matchesStoryQuery(stories[0], 'สอบ')).toBe(true)
    expect(matchesStoryQuery(stories[1], 'มะลิ')).toBe(true)
    expect(matchesStoryQuery(stories[1], 'เข้าห้อง')).toBe(true)
    expect(matchesStoryQuery(stories[1], 'ไม่พบ')).toBe(false)
  })
})
