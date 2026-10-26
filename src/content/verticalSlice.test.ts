import { describe, expect, it } from 'vitest'
import configJson from '../../public/content/config.json'
import eventsJson from '../../public/content/events.json'
import endingsJson from '../../public/content/endings.json'
import assetsJson from '../../public/content/assets.json'
import charactersJson from '../../public/content/characters.json'
import {
  assetListSchema,
  characterListSchema,
  endingListSchema,
  eventListSchema,
  gameConfigSchema,
} from './schema'
import { choose, createGame, getCurrentEvent } from '../engine/game'

const content = {
  config: gameConfigSchema.parse(configJson),
  events: eventListSchema.parse(eventsJson),
  endings: endingListSchema.parse(endingsJson),
}
const assets = assetListSchema.parse(assetsJson)
const characters = characterListSchema.parse(charactersJson)

function playFirstTerm(seed: number, preferred: Record<string, string>) {
  let save = createGame(content, 'ฟ้า', seed)
  const visited: string[] = []
  for (
    let step = 0;
    step < 20 &&
    save.currentTime.year === 1 &&
    save.currentTime.period !== 'term2';
    step += 1
  ) {
    const event = getCurrentEvent(content, save)
    if (!event) throw new Error('Missing event before ending')
    visited.push(event.id)
    const choice = preferred[event.id] ?? event.choices[0].id
    save = choose(content, save, choice)
  }
  if (save.currentTime.period !== 'term2')
    throw new Error('First term did not advance')
  return { save, visited }
}

describe('Year 1 vertical slice', () => {
  it('resolves every referenced image and music ID through the manifest', () => {
    const byId = new Map(assets.map((asset) => [asset.id, asset]))
    expect(byId.size).toBe(assets.length)
    for (const event of content.events) {
      const scene = byId.get(event.sceneAssetId ?? '')
      const bgm = byId.get(event.bgmAssetId ?? '')
      expect(scene?.kind).toBe('scene')
      expect(bgm?.kind).toBe('bgm')
    }
    for (const character of characters) {
      if (character.portraitAssetId) {
        expect(byId.get(character.portraitAssetId)?.kind).toBe('portrait')
      }
    }
  })

  it('offers 14 first-term events and advances past the break without ending', () => {
    expect(
      content.events.filter(
        (event) => event.time.year === 1 && event.time.period === 'term1',
      ),
    ).toHaveLength(14)
    const { save, visited } = playFirstTerm(12345, {})
    expect(visited).toContain('term_reflection')
    expect(save.currentTime).toEqual({ year: 1, period: 'term2' })
    expect(save.endingId).toBeNull()
    expect(visited.length).toBeGreaterThanOrEqual(12)
    expect(visited.length).toBeLessThanOrEqual(14)
  })

  it('merges optional friend and club branches before one random event', () => {
    const joined = playFirstTerm(12345, {
      orientation: 'join_group',
      club_fair: 'join_club',
    })
    const independent = playFirstTerm(12345, {
      orientation: 'explore_campus',
      club_fair: 'keep_schedule',
    })
    expect(joined.visited).toContain('mali_checkin')
    expect(joined.visited).toContain('club_invitation')
    expect(independent.visited).not.toContain('mali_checkin')
    expect(independent.visited).not.toContain('club_invitation')
    for (const result of [joined, independent]) {
      expect(result.visited).toContain('midterm_exam')
      expect(
        result.visited.filter((id) =>
          ['lost_student_card', 'quiet_courtyard'].includes(id),
        ),
      ).toHaveLength(1)
    }
  })

  it('applies a delayed friendship effect after the group project', () => {
    let save = createGame(content, 'ฟ้า', 12345)
    save = choose(content, save, 'join_group')
    expect(save.pendingEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceEventId: 'orientation' }),
      ]),
    )
    while (save.currentEventId !== 'group_project') {
      const event = getCurrentEvent(content, save)
      if (!event) throw new Error('Group project not reached')
      save = choose(content, save, event.choices[0].id)
    }
    const before = save.stats.relationships
    save = choose(content, save, 'share_work')
    expect(save.stats.relationships).toBe(before + 9)
    expect(
      save.pendingEffects.some(
        (pending) => pending.sourceEventId === 'orientation',
      ),
    ).toBe(false)
  })
})
