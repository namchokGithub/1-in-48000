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
import { v2ContentSchema } from '../../content/v2/schema'
import { chooseV2 } from '../../engine/v2/game'
import { createV2PreviewSession } from './preview'

const content = v2ContentSchema.parse({
  config,
  events,
  characters,
  assets,
  endings,
  names,
  faculties,
  majors,
  electives,
})

describe('BO V2 preview session', () => {
  it('plays a choice through the shared engine without changing content', () => {
    const session = createV2PreviewSession(content, 'orientation')
    const next = chooseV2(session.content, session.save, 'join_group')
    expect(next.flags.met_mali).toBe(true)
    expect(next.currentEventId).toBe('first_class')
    expect(content.events[0].active).toBeUndefined()
  })

  it('can preview a conditional or inactive event in an isolated sandbox', () => {
    const conditional = createV2PreviewSession(content, 'mali_checkin')
    expect(conditional.save.flags.met_mali).toBe(true)

    const draft = structuredClone(content)
    draft.events[0].active = false
    const inactive = createV2PreviewSession(draft, 'orientation')
    expect(inactive.save.currentEventId).toBe('orientation')
    expect(inactive.content.events[0].active).toBe(true)
    expect(draft.events[0].active).toBe(false)
  })

  it('rejects a draft with no dialogue instead of rendering an invalid scene', () => {
    const draft = structuredClone(content)
    draft.events[0].lines = []
    expect(() => createV2PreviewSession(draft, 'orientation')).toThrow(
      'เพิ่มบทสนทนา',
    )
  })
})
