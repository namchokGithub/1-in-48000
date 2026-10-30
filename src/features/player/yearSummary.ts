import type { V2PlayerSave } from '../../save/v2/schema'
import { statChanges, type StatChange } from './statChanges'

export type YearSummary = {
  year: number
  changes: StatChange[]
  // The two largest changes among the 0–100 stats, for the headline cards.
  highlights: StatChange[]
  moneyIn: number
  moneyOut: number
  // Every event visit of the year in play order, repeats included.
  events: string[]
}

// The year that just ended, while the player is in the year after it.
export function yearSummary(
  events: { id: string; title: string }[],
  save: Pick<V2PlayerSave, 'currentTime' | 'history' | 'finishedYear'>,
): YearSummary | null {
  const finished = save.finishedYear
  if (!finished || finished.year !== save.currentTime.year - 1) return null
  const changes = statChanges(finished.startStats, finished.endStats)
  return {
    year: finished.year,
    changes,
    highlights: changes
      .filter(({ stat }) => stat !== 'money' && stat !== 'debt')
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 2),
    moneyIn: finished.moneyIn,
    moneyOut: finished.moneyOut,
    events: save.history
      .filter((entry) => entry.time?.year === finished.year)
      .map(
        (entry) =>
          events.find((event) => event.id === entry.eventId)?.title ??
          entry.eventId,
      ),
  }
}
