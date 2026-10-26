import { describe, expect, it } from 'vitest'
import config from '../../../public/content/config.json'
import events from '../../../public/content/events.json'
import endings from '../../../public/content/endings.json'
import {
  endingListSchema,
  eventListSchema,
  gameConfigSchema,
} from '../../content/schema'
import { choose } from '../../engine/game'
import { createPreviewSave } from './preview'

const content = {
  config: gameConfigSchema.parse(config),
  events: eventListSchema.parse(events),
  endings: endingListSchema.parse(endings),
}

describe('BO event preview', () => {
  it('uses the game engine to apply a selected choice', () => {
    const preview = createPreviewSave(content, 'orientation')
    const after = choose(content, preview, 'join_group')
    expect(after.flags.met_mali).toBe(true)
    expect(after.currentEventId).toBe('first_class')
  })

  it('can open a conditional event with its required true flags', () => {
    const preview = createPreviewSave(content, 'mali_checkin')
    expect(preview.currentEventId).toBe('mali_checkin')
    expect(preview.flags.met_mali).toBe(true)
    expect(choose(content, preview, 'share_worry').stats.stress).toBeLessThan(
      preview.stats.stress,
    )
  })
})
