import { describe, expect, it } from 'vitest'
import {
  ALL,
  NO_POOL,
  allEvents,
  eventPools,
  isFiltering,
  matchesEventFilter,
  matchesStoryQuery,
  usedEventIds,
  type EventFilter,
} from './timelineFilters'

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

describe('BO event filters', () => {
  const event = (
    id: string,
    extra: {
      kind?: 'main' | 'conditional' | 'holiday' | 'random'
      pool?: string
      active?: boolean
      year?: number
      period?: string
    } = {},
  ) => ({
    id,
    kind: extra.kind ?? ('main' as const),
    pool: extra.pool,
    active: extra.active,
    time: { year: extra.year ?? 1, period: extra.period ?? 'term1' },
  })
  const events = [
    event('placed'),
    event('drawn', { kind: 'random', pool: 'campus_life' }),
    event('orphan_pool', { kind: 'random', pool: 'unused_pool' }),
    event('orphan', { kind: 'holiday', year: 2, period: 'break' }),
    event('off', { active: false }),
  ]
  const flow = {
    nodes: [
      { type: 'start' },
      { type: 'event', eventId: 'placed' },
      { type: 'random', poolId: 'campus_life' },
    ],
  }
  const used = usedEventIds(flow, events)
  const ids = (filter: Partial<EventFilter>) =>
    events
      .filter((item) =>
        matchesEventFilter(item, { ...allEvents, ...filter }, used),
      )
      .map((item) => item.id)

  it('counts placed cards and Pools drawn by a Random card as used', () => {
    expect([...used].sort()).toEqual(['drawn', 'placed'])
  })

  it('filters by Pool, outside every Pool, kind, year, and period', () => {
    expect(ids({})).toEqual(events.map((item) => item.id))
    expect(ids({ pool: 'campus_life' })).toEqual(['drawn'])
    expect(ids({ pool: NO_POOL })).toEqual(['placed', 'orphan', 'off'])
    expect(ids({ kind: 'random' })).toEqual(['drawn', 'orphan_pool'])
    expect(ids({ year: '2', period: 'break' })).toEqual(['orphan'])
    expect(ids({ year: '2', period: 'term1' })).toEqual([])
  })

  it('filters by status, including active events the flow never reaches', () => {
    expect(ids({ status: 'active' })).toEqual([
      'placed',
      'drawn',
      'orphan_pool',
      'orphan',
    ])
    expect(ids({ status: 'inactive' })).toEqual(['off'])
    expect(ids({ status: 'unused' })).toEqual(['orphan_pool', 'orphan'])
    expect(ids({ status: 'unused', kind: 'holiday' })).toEqual(['orphan'])
  })

  it('lists Pools with counts and tells when a filter is set', () => {
    expect(eventPools(events)).toEqual([
      { pool: 'campus_life', count: 1 },
      { pool: 'unused_pool', count: 1 },
    ])
    expect(isFiltering(allEvents)).toBe(false)
    expect(isFiltering({ ...allEvents, kind: 'main' })).toBe(true)
    expect(allEvents.pool).toBe(ALL)
  })
})
