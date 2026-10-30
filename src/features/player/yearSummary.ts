import type { V2PlayerSave } from '../../save/v2/schema'
import { statChanges, type StatChange } from './statChanges'

export type YearSummary = {
  year: number
  changes: StatChange[]
  moneyIn: number
  moneyOut: number
  events: string[]
}

// The year that just ended, while the player is in the year after it.
export function yearSummary(
  events: { id: string; title: string }[],
  save: Pick<V2PlayerSave, 'currentTime' | 'history' | 'finishedYear'>,
): YearSummary | null {
  const finished = save.finishedYear
  if (!finished || finished.year !== save.currentTime.year - 1) return null
  const visited = new Set(
    save.history
      .filter((entry) => entry.time?.year === finished.year)
      .map((entry) => entry.eventId),
  )
  return {
    year: finished.year,
    changes: statChanges(finished.startStats, finished.endStats),
    moneyIn: finished.moneyIn,
    moneyOut: finished.moneyOut,
    events: [...visited].map(
      (id) => events.find((event) => event.id === id)?.title ?? id,
    ),
  }
}
