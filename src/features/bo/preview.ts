import { createGame, type GameContent } from '../../engine/game'
import type { PlayerSave } from '../../save/schema'
import { createV2Game, type V2GameContent } from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'

export function createPreviewSave(
  content: GameContent,
  eventId: string,
): PlayerSave {
  const event = content.events.find((entry) => entry.id === eventId)
  if (!event) throw new Error(`Unknown event: ${eventId}`)
  const save = createGame(content, 'ตัวอย่าง', 1)
  return {
    ...save,
    currentTime: { ...event.time },
    currentEventId: event.id,
    flags: Object.fromEntries(
      event.conditions.flatMap((condition) =>
        condition.type === 'flag' && condition.value
          ? [[condition.flagId, true]]
          : [],
      ),
    ),
  }
}

export function createV2PreviewSave(
  content: V2GameContent,
  eventId: string,
): V2PlayerSave {
  const event = content.events.find((entry) => entry.id === eventId)
  if (!event || event.active === false)
    throw new Error(`Unavailable event: ${eventId}`)
  const save = createV2Game(content, 'ตัวอย่าง', 1)
  return {
    ...save,
    currentTime: { ...event.time },
    currentEventId: event.id,
    flags: Object.fromEntries(
      event.conditions.flatMap((condition) =>
        condition.type === 'flag' && condition.value
          ? [[condition.flagId, true]]
          : [],
      ),
    ),
  }
}
