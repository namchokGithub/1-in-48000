import type { GameTime } from '../../content/schema'
import { compareTime } from '../../engine/time'

export function moveEvent<T extends { id: string; time: GameTime }>(
  events: T[],
  id: string,
  targetTime: GameTime,
  targetIndex: number,
): T[] {
  const sourceIndex = events.findIndex((event) => event.id === id)
  if (sourceIndex < 0) throw new Error(`Unknown event: ${id}`)
  const source = events[sourceIndex]
  const sourceSlotIndex = events
    .slice(0, sourceIndex)
    .filter((event) => compareTime(event.time, source.time) === 0).length
  const sameSlot = compareTime(source.time, targetTime) === 0
  const adjustedIndex =
    sameSlot && sourceSlotIndex < targetIndex ? targetIndex - 1 : targetIndex
  const remaining = [...events]
  remaining.splice(sourceIndex, 1)
  const slotPositions = remaining.flatMap((event, index) =>
    compareTime(event.time, targetTime) === 0 ? [index] : [],
  )
  const insertAt = slotPositions.length
    ? adjustedIndex >= slotPositions.length
      ? slotPositions[slotPositions.length - 1] + 1
      : slotPositions[Math.max(0, adjustedIndex)]
    : remaining.findIndex((event) => compareTime(event.time, targetTime) > 0)
  const position = insertAt < 0 ? remaining.length : insertAt
  remaining.splice(position, 0, { ...source, time: { ...targetTime } })
  return remaining
}
