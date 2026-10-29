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
