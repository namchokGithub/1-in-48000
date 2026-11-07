import type { V2Content } from '../../content/v2/schema'

type Content = Pick<V2Content, 'flow' | 'events' | 'assets'>

/**
 * Scene image paths the player may see next, for preloading while the
 * current event is read. It walks the Flow board forward from `nodeId`
 * through every edge, ignoring conditions, up to `depth` events away, and
 * includes a few events of each random pool on the way. The current
 * scene and duplicates are left out; at most `limit` paths come back.
 */
export function upcomingScenePaths(
  content: Content,
  nodeId: string | null,
  { depth = 2, limit = 6, poolSample = 3 } = {},
): string[] {
  if (!nodeId) return []
  const nodes = new Map(content.flow.nodes.map((node) => [node.id, node]))
  const events = new Map(content.events.map((event) => [event.id, event]))
  const scenes = new Map(
    content.assets
      .filter((asset) => asset.kind === 'scene')
      .map((asset) => [asset.id, asset.path]),
  )
  const outgoing = new Map<string, string[]>()
  for (const edge of content.flow.edges)
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to])

  const startScene = (() => {
    const node = nodes.get(nodeId)
    const event = node?.type === 'event' ? events.get(node.eventId) : undefined
    return event?.sceneAssetId
  })()
  const paths: string[] = []
  const add = (sceneId?: string) => {
    const path = sceneId && sceneId !== startScene && scenes.get(sceneId)
    if (path && !paths.includes(path)) paths.push(path)
  }

  // Breadth-first by events passed, so nearer events come first. Condition
  // and Next Period cards are passed through within the same round.
  const seen = new Set([nodeId])
  let frontier = [nodeId]
  for (let round = 0; round < depth && frontier.length; round += 1) {
    const next: string[] = []
    for (let index = 0; index < frontier.length; index += 1) {
      for (const to of outgoing.get(frontier[index]) ?? []) {
        if (seen.has(to)) continue
        seen.add(to)
        const node = nodes.get(to)
        if (!node || node.type === 'ending') continue
        if (node.type === 'event') {
          add(events.get(node.eventId)?.sceneAssetId)
          next.push(to)
        } else if (node.type === 'random') {
          content.events
            .filter((event) => event.pool === node.poolId)
            .slice(0, poolSample)
            .forEach((event) => add(event.sceneAssetId))
          next.push(to)
        } else frontier.push(to)
      }
    }
    frontier = next
  }
  return paths.slice(0, limit)
}
