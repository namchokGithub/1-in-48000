export function orderedStoryEntries<T extends { active?: boolean }>(
  events: T[],
) {
  const entries = events.map((event, index) => ({ event, index }))
  return [
    ...entries.filter(({ event }) => event.active !== false),
    ...entries.filter(({ event }) => event.active === false),
  ]
}

export function timelineStories<T extends { active?: boolean }>(
  events: T[],
): T[] {
  return events.filter((event) => event.active !== false)
}

export function neighboringStoryIndex<T extends { active?: boolean }>(
  events: T[],
  selectedIndex: number,
  direction: -1 | 1,
): number {
  const ordered = orderedStoryEntries(events)
  const position = ordered.findIndex(({ index }) => index === selectedIndex)
  const target = ordered[position + direction]
  if (!target || position < 0) return -1
  const selected = events[selectedIndex]
  return (selected.active === false) === (target.event.active === false)
    ? target.index
    : -1
}
