import type { GameTime } from '../content/schema'

const periods = ['term1', 'break', 'term2', 'summer'] as const

export function compareTime(left: GameTime, right: GameTime): number {
  return (
    left.year - right.year ||
    periods.indexOf(left.period) - periods.indexOf(right.period)
  )
}

export function nextTime(time: GameTime): GameTime | null {
  const nextPeriod = periods[periods.indexOf(time.period) + 1]
  if (nextPeriod) return { year: time.year, period: nextPeriod }
  if (time.year === 4) return null
  return { year: time.year + 1, period: 'term1' }
}
