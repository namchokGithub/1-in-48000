type EventKind = 'main' | 'conditional' | 'holiday' | 'random'

type SearchableStory = {
  id: string
  title: string
  kind: EventKind
  active?: boolean
  time: { year: number; period: string }
  lines?: { text: string }[]
  choices?: { text: string }[]
}

export function matchesStoryQuery(
  story: SearchableStory,
  query: string,
): boolean {
  const needle = query.trim().toLocaleLowerCase('th-TH')
  if (!needle) return true
  return [
    story.id,
    story.title,
    ...(story.lines ?? []).map((line) => line.text),
    ...(story.choices ?? []).map((choice) => choice.text),
  ].some((text) => text.toLocaleLowerCase('th-TH').includes(needle))
}

export const ALL = '#all'
/** Pool filter value for events outside every Pool. */
export const NO_POOL = '#none'

export type EventStatusFilter = 'all' | 'active' | 'inactive' | 'unused'

/** Event list filters; '#all' (or 'all' for status) lets every event through. */
export type EventFilter = {
  pool: string
  kind: string
  year: string
  period: string
  status: EventStatusFilter
}

export const allEvents: EventFilter = {
  pool: ALL,
  kind: ALL,
  year: ALL,
  period: ALL,
  status: 'all',
}

type FilterableEvent = {
  id: string
  kind: EventKind
  active?: boolean
  pool?: string
  time: { year: number; period: string }
}

type FlowUsage = {
  nodes: (
    | { type: 'event'; eventId: string }
    | { type: 'random'; poolId: string }
    | { type: string }
  )[]
}

/**
 * Events the Story Flow can reach: placed as an event card, or in a Pool that
 * a Random card draws from.
 */
export function usedEventIds(
  flow: FlowUsage,
  events: Pick<FilterableEvent, 'id' | 'pool'>[],
): Set<string> {
  const placed = new Set<string>()
  const pools = new Set<string>()
  for (const node of flow.nodes) {
    if (node.type === 'event' && 'eventId' in node) placed.add(node.eventId)
    if (node.type === 'random' && 'poolId' in node) pools.add(node.poolId)
  }
  return new Set(
    events
      .filter(
        (event) =>
          placed.has(event.id) || (event.pool && pools.has(event.pool)),
      )
      .map((event) => event.id),
  )
}

export function matchesEventFilter(
  event: FilterableEvent,
  filter: EventFilter,
  used: Set<string>,
): boolean {
  if (
    filter.pool === NO_POOL
      ? !!event.pool
      : filter.pool !== ALL && event.pool !== filter.pool
  )
    return false
  if (filter.kind !== ALL && event.kind !== filter.kind) return false
  if (filter.year !== ALL && String(event.time.year) !== filter.year)
    return false
  if (filter.period !== ALL && event.time.period !== filter.period) return false
  const active = event.active !== false
  if (filter.status === 'active') return active
  if (filter.status === 'inactive') return !active
  if (filter.status === 'unused') return active && !used.has(event.id)
  return true
}

export function isFiltering(filter: EventFilter): boolean {
  return (Object.keys(allEvents) as (keyof EventFilter)[]).some(
    (key) => filter[key] !== allEvents[key],
  )
}

/** Pools in file order with how many events each holds. */
export function eventPools(
  events: Pick<FilterableEvent, 'pool'>[],
): { pool: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const event of events)
    if (event.pool) counts.set(event.pool, (counts.get(event.pool) ?? 0) + 1)
  return [...counts].map(([pool, count]) => ({ pool, count }))
}
