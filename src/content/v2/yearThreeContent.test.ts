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
  createV2Game,
  getV2CurrentEvent,
} from '../../engine/v2/game'

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

describe('year-three authored story', () => {
  it('has the required events, recaps, and both requested scenes', () => {
    const yearThree = events.filter((event) => event.time?.year === 3)
    for (const [period, mainCount, sideCount] of [
      ['term1', 7, 2],
      ['break', 5, 2],
      ['term2', 5, 2],
      ['summer', 5, 2],
    ] as const) {
      const inPeriod = yearThree.filter(
        (event) => event.time?.period === period,
      )
      expect(inPeriod.filter((event) => event.kind === 'main')).toHaveLength(
        mainCount,
      )
      expect(
        inPeriod.filter((event) => event.kind === 'conditional'),
      ).toHaveLength(sideCount)
    }
    for (const event of yearThree) {
      if (event.id !== 'free_elective') {
        expect(event.choices.length).toBeGreaterThanOrEqual(2)
        expect(event.choices.length).toBeLessThanOrEqual(4)
      }
      expect(
        event.choices.every(
          (choice) => 'recap' in choice && Boolean(choice.recap),
        ),
      ).toBe(true)
    }
    expect(
      yearThree.some((event) => event.sceneAssetId === 'bang_saen_beach'),
    ).toBe(true)
    expect(
      yearThree.some(
        (event) => event.sceneAssetId === 'khao_sam_muk_viewpoint',
      ),
    ).toBe(true)
  })

  it('plays both branch patterns across all four periods into year four', async () => {
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    const play = (allSides: boolean) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 2, period: 'summer' },
        currentNodeId: 'n_y2_summer_last_week',
        currentEventId: 'y2_summer_last_week',
        flags: allSides
          ? { met_mali: true, joined_club: true, y2_summer_helped_peer: true }
          : {},
      }
      save = chooseV2(content, save, 'sleep_in')
      const seen: string[] = []
      for (let step = 0; step < 45; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        if (event.id === 'thesis_topic') break
        seen.push(event.id)
        if (event.id === 'free_elective') {
          save = chooseV2Elective(content, save, 'creative_writing')
          continue
        }
        const choices: Record<string, string> = {
          y3_term1_source_check: allSides
            ? 'verify_source'
            : 'leave_blank_cell',
          project_pitch: allSides ? 'ask_mentor' : 'pitch_alone',
          y3_term2_scope_cut: allSides ? 'invite_partner' : 'work_solo',
        }
        save = chooseV2(content, save, choices[event.id] ?? event.choices[0].id)
      }
      expect(save.currentEventId).toBe('thesis_topic')
      expect(save.currentTime).toEqual({ year: 4, period: 'term1' })
      return { seen, flags: save.flags }
    }

    const withSides = play(true)
    for (const id of [
      'y3_term1_mali_route',
      'y3_term1_peer_return',
      'y3_break_club_storage',
      'y3_break_source_reply',
      'mentor_feedback',
      'y3_term2_trial_partner',
      'y3_summer_mentor_message',
      'y3_summer_peer_promise',
    ])
      expect(withSides.seen).toContain(id)
    expect(withSides.flags.y3_term1_checked_source).toBe(true)
    expect(withSides.flags.y3_term2_invited_partner).toBe(true)

    const withoutSides = play(false)
    const sharedEvents = content.events.filter(
      (event) =>
        event.time?.year === 3 &&
        (event.kind === 'main' || event.kind === 'holiday'),
    )
    for (const event of sharedEvents) {
      expect(withSides.seen).toContain(event.id)
      expect(withoutSides.seen).toContain(event.id)
    }
    for (const id of [
      'y3_term1_mali_route',
      'y3_term1_peer_return',
      'y3_break_club_storage',
      'y3_break_source_reply',
      'mentor_feedback',
      'y3_term2_trial_partner',
      'y3_summer_mentor_message',
      'y3_summer_peer_promise',
    ])
      expect(withoutSides.seen).not.toContain(id)
  })
})
