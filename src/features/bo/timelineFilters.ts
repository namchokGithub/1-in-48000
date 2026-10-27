import { timelineStories } from './storyVisibility'

export type EventKind = 'main' | 'conditional' | 'holiday' | 'random'
export type KindFilter = EventKind | 'all'

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

export function filterTimelineStories<T extends SearchableStory>(
  events: T[],
  query: string,
  kind: KindFilter,
): T[] {
  return timelineStories(events).filter(
    (story) =>
      (kind === 'all' || story.kind === kind) &&
      matchesStoryQuery(story, query),
  )
}

export function mainEventCount(
  events: SearchableStory[],
  time: { year: number; period: string },
): number {
  return timelineStories(events).filter(
    (story) =>
      story.kind === 'main' &&
      story.time.year === time.year &&
      story.time.period === time.period,
  ).length
}
