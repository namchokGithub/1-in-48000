import { createV2Game, type V2GameContent } from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import type { V2Content } from '../../content/v2/schema'

const PREVIEW_NODE_ID = 'bo_preview_event'

function previewNodeId(content: V2GameContent, eventId: string): string {
  const event = content.events.find((entry) => entry.id === eventId)
  const node = content.flow.nodes.find(
    (item) =>
      (item.type === 'event' && item.eventId === eventId) ||
      (item.type === 'random' && item.poolId === event?.pool),
  )
  return node?.id ?? PREVIEW_NODE_ID
}

export function createV2PreviewSave(
  content: V2GameContent,
  eventId: string,
): V2PlayerSave {
  const event = content.events.find((entry) => entry.id === eventId)
  if (!event || event.active === false)
    throw new Error(`Unavailable event: ${eventId}`)
  const save = createV2Game(content, 1)
  const nodeId = previewNodeId(content, eventId)
  const conditions = [
    ...event.conditions,
    ...content.flow.edges.flatMap((edge) =>
      edge.to === nodeId && edge.condition ? [edge.condition] : [],
    ),
  ]
  const majorId =
    conditions.find((condition) => condition.type === 'major')?.majorId ?? null
  const major = content.majors.find((item) => item.id === majorId)
  const facultyId =
    conditions.find((condition) => condition.type === 'faculty')?.facultyId ??
    major?.facultyId ??
    null
  const electiveId =
    conditions.find((condition) => condition.type === 'elective')?.electiveId ??
    null
  return {
    ...save,
    facultyId,
    majorId,
    electiveId,
    currentTime: { ...event.time },
    currentNodeId: nodeId,
    currentEventId: event.id,
    flags: Object.fromEntries(
      conditions.flatMap((condition) =>
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
  const placed = previewNodeId(content, eventId) !== PREVIEW_NODE_ID
  const sandbox: V2Content = {
    ...content,
    events: content.events.map((event) =>
      event.id === eventId ? { ...event, active: true } : event,
    ),
    flow: placed
      ? content.flow
      : {
          ...content.flow,
          nodes: [
            ...content.flow.nodes,
            {
              id: PREVIEW_NODE_ID,
              type: 'event',
              eventId,
              position: { x: 0, y: 0 },
            },
          ],
        },
  }
  const save = createV2PreviewSave(sandbox, eventId)
  return { content: sandbox, save, placed, startNodeId: save.currentNodeId }
}
