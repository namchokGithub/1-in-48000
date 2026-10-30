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
import flow from '../../../public/content-v2/flow.json'
import { loadV2Content } from './loader'
import {
  chooseV2,
  chooseV2Elective,
  chooseV2Many,
  chooseV2Program,
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
      flow,
    }
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    expect(content.events).toHaveLength(38)
    expect(content.config.contentVersion).toBe('0.3.0')
    expect(
      content.names.every((name) =>
        [name.portraits?.casual, name.portraits?.student].every((id) =>
          content.assets.some(
            (asset) => asset.id === id && asset.kind === 'portrait',
          ),
        ),
      ),
    ).toBe(true)
    expect(
      content.events.some((event) => event.selection?.type === 'multiple'),
    ).toBe(true)
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
      flow,
    }
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    let save = createV2Game(content, 42)
    const seen = new Set<string>()
    for (let step = 0; step < 100 && !save.endingId; step += 1) {
      const event = getV2CurrentEvent(content, save)
      expect(event).not.toBeNull()
      seen.add(event!.id)
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
      save =
        event!.selection?.type === 'program'
          ? chooseV2Program(
              content,
              save,
              content.faculties[0].id,
              content.majors[0].id,
            )
          : event!.selection?.type === 'elective'
            ? chooseV2Elective(content, save, content.electives[0].id)
            : event!.selection?.type === 'multiple'
              ? chooseV2Many(
                  content,
                  save,
                  getV2AvailableChoices(event!, save)
                    .slice(0, event!.selection.min)
                    .map((choice) => choice.id),
                )
              : chooseV2(content, save, choice.id)
    }
    expect(save.endingId).not.toBeNull()
    expect(seen).toContain('choose_program')
    expect(seen).toContain('free_elective')
    expect(seen).toContain('year_two_plans')
    expect(save.electiveId).toBe(content.electives[0].id)
    expect(
      save.history.find((entry) => entry.eventId === 'year_two_plans')
        ?.choiceIds,
    ).toHaveLength(2)
  })

  it('reaches every graduation ending through the converted flow', async () => {
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
      flow,
    }
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    let state = 1
    const pick = (count: number) => {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
      return state % count
    }
    const reached = new Set<string>()
    for (let run = 0; run < 200; run += 1) {
      const major = content.majors[run % content.majors.length]
      let save = createV2Game(content, run)
      for (let step = 0; step < 300 && !save.endingId; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        const choices = getV2AvailableChoices(event, save).filter((choice) =>
          choice.effects.every(
            (effect) =>
              effect.type !== 'schedule' ||
              effect.trigger.type !== 'afterEvent' ||
              !save.history.some(
                (visited) =>
                  effect.trigger.type === 'afterEvent' &&
                  visited.eventId === effect.trigger.eventId,
              ),
          ),
        )
        save =
          event.selection?.type === 'program'
            ? chooseV2Program(content, save, major.facultyId, major.id)
            : event.selection?.type === 'elective'
              ? chooseV2Elective(content, save, content.electives[0].id)
              : event.selection?.type === 'multiple'
                ? chooseV2Many(
                    content,
                    save,
                    choices
                      .slice(0, event.selection.min)
                      .map((choice) => choice.id),
                  )
                : chooseV2(content, save, choices[pick(choices.length)].id)
      }
      reached.add(save.endingId ?? 'none')
    }
    expect([...reached].sort()).toEqual([
      'academic_path',
      'community_path',
      'graduation',
    ])
  })
})
