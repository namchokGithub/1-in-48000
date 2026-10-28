import { describe, expect, it } from 'vitest'
import config from '../../../public/content-v2/config.json'
import events from '../../../public/content-v2/events.json'
import characters from '../../../public/content-v2/characters.json'
import assets from '../../../public/content-v2/assets.json'
import endings from '../../../public/content-v2/endings.json'
import names from '../../../public/content-v2/names.json'
import faculties from '../../../public/content-v2/faculties.json'
import majors from '../../../public/content-v2/majors.json'
import electives from '../../../public/content-v2/electives.json'
import { loadV2Content } from './loader'
import {
  chooseV2,
  createV2Game,
  getV2AvailableChoices,
  getV2CurrentEvent,
} from '../../engine/v2/game'

describe('live V2 content', () => {
  it('loads the authored story with the shared V2 schema', async () => {
    const files: Record<string, unknown> = {
      config,
      events,
      characters,
      assets,
      endings,
      names,
      faculties,
      majors,
      electives,
    }
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    expect(content.events).toHaveLength(36)
    expect(content.config.contentVersion).toBe('0.1.0')
    expect(content.endings.some((ending) => ending.id === 'dismissal')).toBe(
      true,
    )
  })

  it('plays the authored V2 content from enrollment to an ending', async () => {
    const files: Record<string, unknown> = {
      config,
      events,
      characters,
      assets,
      endings,
      names,
      faculties,
      majors,
      electives,
    }
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    let save = createV2Game(content, 'ฟ้า', 42)
    for (let step = 0; step < 100 && !save.endingId; step += 1) {
      const event = getV2CurrentEvent(content, save)
      expect(event).not.toBeNull()
      const choice = getV2AvailableChoices(event!, save).find((candidate) =>
        candidate.effects.every((effect) => {
          if (effect.type !== 'schedule') return true
          const trigger = effect.trigger
          if (trigger.type !== 'afterEvent') return true
          return !save.history.some(
            (visited) => visited.eventId === trigger.eventId,
          )
        }),
      )
      if (!choice) throw new Error(`No playable choice in ${event!.id}`)
      save = chooseV2(content, save, choice.id)
    }
    expect(save.endingId).not.toBeNull()
  })
})
