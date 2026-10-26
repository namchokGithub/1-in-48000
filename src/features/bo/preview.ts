import { createGame, type GameContent } from '../../engine/game'
import type { PlayerSave } from '../../save/schema'

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
