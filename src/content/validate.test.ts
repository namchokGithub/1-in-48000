import { describe, expect, it } from 'vitest'
import config from '../../public/content/config.json'
import events from '../../public/content/events.json'
import characters from '../../public/content/characters.json'
import assets from '../../public/content/assets.json'
import endings from '../../public/content/endings.json'
import type { PlayerContent } from './loader'
import { validateContent } from './validate'

const sample = { config, events, characters, assets, endings }

describe('BO content validation', () => {
  it('accepts the current Player content', () => {
    expect(validateContent(sample)).toEqual([])
  })

  it('reports duplicate event, choice, ending, and asset IDs', () => {
    const copy = structuredClone(sample) as unknown as PlayerContent
    copy.events.push(structuredClone(copy.events[0]))
    copy.events[0].choices.push(structuredClone(copy.events[0].choices[0]))
    copy.endings.push(structuredClone(copy.endings[0]))
    copy.assets.push(structuredClone(copy.assets[0]))
    const paths = validateContent(copy).map((issue) => issue.path)
    expect(paths).toContain(`events.${events.length}.id`)
    expect(paths).toContain('events.0.choices.2.id')
    expect(paths).toContain(`endings.${endings.length}.id`)
    expect(paths).toContain(`assets.${assets.length}.id`)
  })

  it('reports broken event links and missing asset IDs', () => {
    const copy = structuredClone(sample) as unknown as PlayerContent
    copy.config.startingEventId = 'missing_start'
    copy.events[0].sceneAssetId = 'missing_scene'
    copy.events[0].choices[0].effects.push({
      type: 'goToEvent',
      eventId: 'missing_event',
    })
    const paths = validateContent(copy).map((issue) => issue.path)
    expect(paths).toContain('config.startingEventId')
    expect(paths).toContain('events.0.sceneAssetId')
    expect(paths).toContain(
      `events.0.choices.0.effects.${events[0].choices[0].effects.length}.eventId`,
    )
  })

  it('reports schema errors before cross-file checks', () => {
    const copy = structuredClone(sample) as unknown as PlayerContent
    copy.events[0].title = ''
    expect(
      validateContent(copy).some((issue) => issue.path === 'events.0.title'),
    ).toBe(true)
  })

  it('requires snake_case event and choice IDs in the active BO schema', () => {
    const copy = structuredClone(sample) as unknown as PlayerContent
    copy.events[0].id = 'bad-event'
    copy.events[0].choices[0].id = 'BadChoice'
    const paths = validateContent(copy).map((issue) => issue.path)
    expect(paths).toContain('events.0.id')
    expect(paths).toContain('events.0.choices.0.id')
  })

  it('requires at least one ending before saving', () => {
    const copy = structuredClone(sample) as unknown as PlayerContent
    copy.endings = []
    expect(validateContent(copy).map((issue) => issue.path)).toContain(
      'endings',
    )
  })
})
