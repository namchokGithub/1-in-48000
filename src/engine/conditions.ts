import type { Condition } from '../content/schema'
import type { PlayerSave } from '../save/schema'

function compare(
  actual: number,
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte',
  expected: number,
): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected
    case 'gt':
      return actual > expected
    case 'gte':
      return actual >= expected
    case 'lt':
      return actual < expected
    case 'lte':
      return actual <= expected
  }
}

export function matchesAllConditions(
  conditions: Condition[],
  save: PlayerSave,
): boolean {
  return conditions.every((condition) => {
    switch (condition.type) {
      case 'year':
        return compare(
          save.currentTime.year,
          condition.operator,
          condition.value,
        )
      case 'stat':
        return compare(
          save.stats[condition.stat],
          condition.operator,
          condition.value,
        )
      case 'flag':
        return (save.flags[condition.flagId] ?? false) === condition.value
      case 'pastEvent':
        return (
          save.history.some((entry) => entry.eventId === condition.eventId) ===
          condition.visited
        )
    }
  })
}
