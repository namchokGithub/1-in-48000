import { describe, expect, it } from 'vitest'
import sample from '../../content/v2/sample-content.json'
import flow from '../../content/v2/sample-flow.json'
import { v2ContentSchema } from '../../content/v2/schema'
import names from '../../../public/content-v2/names.json'
import { createV2GameStore } from './store'

const content = v2ContentSchema.parse({ ...sample, names, flow })

function checkpointStorage() {
  let raw: string | null = null
  let active = false
  return {
    storage: {
      read: () => raw,
      write: (value: string) => {
        raw = value
      },
    },
    session: {
      read: () => active,
      write: (value: boolean) => {
        active = value
      },
    },
    raw: () => raw,
  }
}

describe('V2 checkpoint store', () => {
  it('restores a valid run after refresh in the same tab', () => {
    const { storage, session, raw } = checkpointStorage()
    const first = createV2GameStore(content, storage, session)
    const started = first.getState().startGame(2049)
    expect(started.playerName).toBe(
      names.find((name) => name.id === started.nameId)?.name,
    )
    first.getState().chooseProgram('humanities', 'thai_language')
    const chosen = first.getState().choose('apply_kyos')
    expect(chosen.stats.debt).toBe(3000)
    expect(JSON.parse(raw() ?? '').history).toHaveLength(2)
    const refreshed = createV2GameStore(content, storage, session)
    expect(refreshed.getState().restoreGame()).toEqual(chosen)
    expect(refreshed.getState().save?.rngState).toBe(chosen.rngState)
  })

  it('starts fresh in a new tab and ignores invalid or old content saves', () => {
    const { storage, session } = checkpointStorage()
    const first = createV2GameStore(content, storage, session)
    first.getState().startGame(77)
    const newTab = createV2GameStore(content, storage, {
      read: () => false,
      write: () => undefined,
    })
    expect(newTab.getState().restoreGame()).toBeNull()
    expect(newTab.getState().save).toBeNull()
    storage.write('{broken')
    expect(
      createV2GameStore(content, storage, session).getState().restoreGame(),
    ).toBeNull()
    expect(session.read()).toBe(false)
    session.write(true)
    storage.write(
      JSON.stringify({ ...first.getState().save, contentVersion: 'old' }),
    )
    expect(
      createV2GameStore(content, storage, session).getState().restoreGame(),
    ).toBeNull()
    expect(session.read()).toBe(false)
  })

  it('rejects a checkpoint pointing to a removed event', () => {
    const { storage, session } = checkpointStorage()
    const first = createV2GameStore(content, storage, session)
    const save = first.getState().startGame(9)
    storage.write(JSON.stringify({ ...save, currentEventId: 'missing_event' }))
    expect(
      createV2GameStore(content, storage, session).getState().restoreGame(),
    ).toBeNull()
    expect(session.read()).toBe(false)
  })

  it('does not resume a run after its ending', () => {
    const opening = sample.events.find(
      (event) => event.id === 'choose_program',
    )!
    const endingContent = v2ContentSchema.parse({
      ...sample,
      names,
      events: [opening],
      flow: {
        nodes: [
          { id: 'start', type: 'start', position: { x: 0, y: 0 } },
          {
            id: 'opening',
            type: 'event',
            eventId: opening.id,
            position: { x: 0, y: 0 },
          },
          {
            id: 'done',
            type: 'ending',
            endingId: 'study_complete',
            position: { x: 0, y: 0 },
          },
        ],
        edges: [
          { id: 'e_start', from: 'start', port: 'next', to: 'opening' },
          { id: 'e_done', from: 'opening', port: 'next', to: 'done' },
        ],
      },
    })
    const { storage, session } = checkpointStorage()
    const store = createV2GameStore(endingContent, storage, session)
    store.getState().startGame(1)
    const ended = store.getState().chooseProgram('humanities', 'thai_language')
    expect(ended.endingId).toBe('study_complete')
    expect(session.read()).toBe(false)
    expect(
      createV2GameStore(endingContent, storage, session)
        .getState()
        .restoreGame(),
    ).toBeNull()
  })
})
