import { describe, expect, it } from 'vitest'
import type { V2Content } from '../../content/v2/schema'
import { upcomingScenePaths } from './upcomingScenes'

const position = { x: 0, y: 0 }
const scene = (id: string) => ({
  id,
  kind: 'scene' as const,
  path: `/assets/scene/${id}.webp`,
})
const event = (id: string, sceneAssetId: string, pool?: string) =>
  ({ id, sceneAssetId, pool }) as V2Content['events'][number]

const content = {
  assets: ['a', 'b', 'c', 'd', 'p1', 'p2'].map(scene),
  events: [
    event('first', 'a'),
    event('second', 'b'),
    event('third', 'c'),
    event('far', 'd'),
    event('pool_one', 'p1', 'market'),
    event('pool_two', 'p2', 'market'),
  ],
  flow: {
    nodes: [
      { id: 'n1', type: 'event', eventId: 'first', position },
      { id: 'n2', type: 'event', eventId: 'second', position },
      { id: 'c', type: 'condition', join: 'and', conditions: [], position },
      { id: 'n3', type: 'event', eventId: 'third', position },
      { id: 'n4', type: 'event', eventId: 'far', position },
      { id: 'r', type: 'random', poolId: 'market', position },
      { id: 'end', type: 'ending', endingId: 'graduation', position },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', port: 'x' },
      { id: 'e2', from: 'n1', to: 'c', port: 'y' },
      { id: 'e3', from: 'c', to: 'n3', port: 'true' },
      { id: 'e4', from: 'n2', to: 'r', port: 'x' },
      { id: 'e5', from: 'n3', to: 'n4', port: 'x' },
      { id: 'e6', from: 'r', to: 'end', port: 'next' },
      { id: 'e7', from: 'n4', to: 'n1', port: 'x' },
    ],
  },
} as unknown as Pick<V2Content, 'flow' | 'events' | 'assets'>

describe('upcomingScenePaths', () => {
  it('lists nearer scenes first, through conditions and random pools', () => {
    expect(upcomingScenePaths(content, 'n1')).toEqual([
      '/assets/scene/b.webp',
      '/assets/scene/c.webp',
      '/assets/scene/p1.webp',
      '/assets/scene/p2.webp',
      '/assets/scene/d.webp',
    ])
  })

  it('stops at the depth and limit and skips the current scene', () => {
    expect(upcomingScenePaths(content, 'n1', { depth: 1 })).toEqual([
      '/assets/scene/b.webp',
      '/assets/scene/c.webp',
    ])
    expect(upcomingScenePaths(content, 'n1', { limit: 1 })).toEqual([
      '/assets/scene/b.webp',
    ])
    expect(upcomingScenePaths(content, 'n4')).not.toContain(
      '/assets/scene/d.webp',
    )
    expect(upcomingScenePaths(content, null)).toEqual([])
  })
})
