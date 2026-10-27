import { describe, expect, it } from 'vitest'
import config from '../../../public/content-v2/config.json'
import events from '../../../public/content-v2/events.json'
import characters from '../../../public/content-v2/characters.json'
import assets from '../../../public/content-v2/assets.json'
import endings from '../../../public/content-v2/endings.json'
import names from '../../../public/content-v2/names.json'
import oldConfig from '../../../public/content/config.json'
import oldEvents from '../../../public/content/events.json'
import oldCharacters from '../../../public/content/characters.json'
import oldAssets from '../../../public/content/assets.json'
import oldEndings from '../../../public/content/endings.json'
import { loadV2Content } from './loader'
import { loadPlayerContent } from '../loader'
import { createGame } from '../../engine/game'
import { loadV2Save } from '../../save/v2/migrations'
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
    }
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    expect(content.events).toHaveLength(35)
    expect(content.config.contentVersion).toBe('0.5.0')
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
    }
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    let save = createV2Game(content, 'ฟ้า', 42)
    for (let step = 0; step < 100 && !save.endingId; step += 1) {
      const event = getV2CurrentEvent(content, save)
      expect(event).not.toBeNull()
      const choice = getV2AvailableChoices(event!, save)[0]
      expect(choice).toBeDefined()
      save = chooseV2(content, save, choice.id)
    }
    expect(save.endingId).not.toBeNull()
  })

  it('continues a save from the published V1 story in V2 content', async () => {
    const oldFiles: Record<string, unknown> = {
      config: oldConfig,
      events: oldEvents,
      characters: oldCharacters,
      assets: oldAssets,
      endings: oldEndings,
    }
    const oldContent = await loadPlayerContent(
      async (path) =>
        oldFiles[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    const files: Record<string, unknown> = {
      config,
      events,
      characters,
      assets,
      endings,
      names,
    }
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    const previous = createGame(oldContent, 'ฟ้า', 42)
    const resumed = loadV2Save(
      JSON.stringify(previous),
      content.config.contentVersion,
    )
    expect(resumed.saveVersion).toBe(3)
    expect(resumed.currentEventId).toBe(previous.currentEventId)
    expect(getV2CurrentEvent(content, resumed)?.id).toBe(
      previous.currentEventId,
    )
  })
})
