import { createV2Game, type V2GameContent } from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import type { V2Content } from '../../content/v2/schema'

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

export function createV2PreviewSession(content: V2Content, eventId: string) {
  const selected = content.events.find((event) => event.id === eventId)
  if (!selected) {
    throw new Error(`Unknown event: ${eventId}`)
  }
  if (!selected.lines.length) {
    throw new Error('เพิ่มบทสนทนาอย่างน้อยหนึ่งบรรทัดก่อนทดลองเหตุการณ์')
  }
  const sandbox: V2Content = {
    ...content,
    events: content.events.map((event) =>
      event.id === eventId || event.id === content.config.startingEventId
        ? { ...event, active: true }
        : event,
    ),
  }
  return { content: sandbox, save: createV2PreviewSave(sandbox, eventId) }
}
