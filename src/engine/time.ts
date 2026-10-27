import type { V2Event } from '../content/v2/schema'

type GameTime = V2Event['time']

const periods = ['term1', 'break', 'term2', 'summer'] as const

export function compareTime(left: GameTime, right: GameTime): number {
  return (
    left.year - right.year ||
    periods.indexOf(left.period) - periods.indexOf(right.period)
  )
}
