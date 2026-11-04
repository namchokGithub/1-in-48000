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
  it('keeps every first-break branch recapped and connected to term two', () => {
    const breakIds = [
      'term_reflection',
      'break_first_week',
      'break_message_from_mali',
      'break_budget',
      'break_club_request',
      'break_low_balance',
      'break_next_term',
    ]
    const breakEvents = events.filter((event) => breakIds.includes(event.id))
    expect(breakEvents).toHaveLength(breakIds.length)
    for (const event of breakEvents) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2)
      expect(event.choices.length).toBeLessThanOrEqual(4)
      expect(
        event.choices.every(
          (choice) => 'recap' in choice && Boolean(choice.recap),
        ),
      ).toBe(true)
    }

    const seen = new Set<string>()
    const visit = (nodeId: string, path = new Set<string>()) => {
      if (nodeId === 'next_y1_break') return
      expect(path.has(nodeId)).toBe(false)
      const node = flow.nodes.find((candidate) => candidate.id === nodeId)
      expect(node).toBeDefined()
      seen.add(nodeId)
      const outgoing = flow.edges.filter((edge) => edge.from === nodeId)
      expect(outgoing.length).toBeGreaterThan(0)
      const nextPath = new Set([...path, nodeId])
      for (const edge of outgoing) visit(edge.to, nextPath)
    }
    visit('n_term_reflection')
    for (const eventId of breakIds) expect(seen.has(`n_${eventId}`)).toBe(true)
  })

  it('plays first-break side stories when eligible and rejoins term two', async () => {
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
    const play = (flags: Record<string, boolean>, money: number) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 1, period: 'break' },
        currentNodeId: 'n_term_reflection',
        currentEventId: 'term_reflection',
        flags,
        stats: { ...save.stats, money },
      }
      const seen: string[] = []
      for (let step = 0; step < 10; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        if (event.id === 'return_to_campus') break
        seen.push(event.id)
        const choiceIds: Record<string, string> = {
          term_reflection: 'keep_journal',
          break_first_week: 'sort_photos',
          break_message_from_mali: 'reply_later',
          break_budget: 'cook_simple_meals',
          break_club_request: 'decline_politely',
          break_low_balance: 'delay_nonessential',
          break_next_term: 'pack_in_morning',
        }
        save = chooseV2(content, save, choiceIds[event.id])
      }
      expect(save.currentEventId).toBe('return_to_campus')
      expect(save.currentTime.period).toBe('term2')
      return seen
    }

    expect(play({ met_mali: true, joined_club: true }, 100)).toEqual([
      'term_reflection',
      'break_first_week',
      'break_message_from_mali',
      'break_budget',
      'break_club_request',
      'break_low_balance',
      'break_next_term',
    ])
    expect(play({}, 1200)).toEqual([
      'term_reflection',
      'break_first_week',
      'break_budget',
      'break_next_term',
    ])
  })

  it('keeps every year-one term-two choice recapped', () => {
    const termTwoIds = [
      'return_to_campus',
      'term2_first_assignment',
      'term2_club_open_house',
      'term2_group_deadline',
      'term2_note_exchange',
      'term2_final_prep',
      'year_one_final',
      'scholarship_notice',
    ]
    const termTwoEvents = events.filter((event) =>
      termTwoIds.includes(event.id),
    )
    expect(termTwoEvents).toHaveLength(termTwoIds.length)
    for (const event of termTwoEvents) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2)
      expect(event.choices.length).toBeLessThanOrEqual(4)
      expect(
        event.choices.every(
          (choice) => 'recap' in choice && Boolean(choice.recap),
        ),
      ).toBe(true)
    }
  })

  it('routes year-one term-two side stories and rejoins summer', async () => {
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
    const play = (
      flags: Record<string, boolean>,
      money: number,
      choices: Record<string, string>,
    ) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 1, period: 'term2' },
        currentNodeId: 'n_return_to_campus',
        currentEventId: 'return_to_campus',
        flags,
        stats: { ...save.stats, money },
      }
      const seen: string[] = []
      for (let step = 0; step < 12; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        if (event.id === 'summer_job') break
        seen.push(event.id)
        save = chooseV2(content, save, choices[event.id])
      }
      expect(save.currentEventId).toBe('summer_job')
      expect(save.currentTime.period).toBe('summer')
      return { seen, sharedNotes: save.flags.term2_shared_notes }
    }

    expect(
      play({ joined_club: true }, 100, {
        return_to_campus: 'budget_semester',
        term2_first_assignment: 'share_notes',
        term2_club_open_house: 'attend_briefly',
        term2_group_deadline: 'divide_tasks',
        term2_note_exchange: 'swap_feedback',
        term2_final_prep: 'sleep_early',
        year_one_final: 'review_notes',
        scholarship_notice: 'apply_aid',
      }),
    ).toEqual({
      seen: [
        'return_to_campus',
        'term2_first_assignment',
        'term2_club_open_house',
        'term2_group_deadline',
        'term2_note_exchange',
        'term2_final_prep',
        'year_one_final',
        'scholarship_notice',
      ],
      sharedNotes: true,
    })
    expect(
      play({}, 1200, {
        return_to_campus: 'take_more_classes',
        term2_first_assignment: 'work_alone',
        term2_group_deadline: 'finish_for_group',
        term2_final_prep: 'take_it_easy',
        year_one_final: 'rest_before_exam',
      }),
    ).toEqual({
      seen: [
        'return_to_campus',
        'term2_first_assignment',
        'term2_group_deadline',
        'term2_final_prep',
        'year_one_final',
      ],
      sharedNotes: undefined,
    })
  })

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
    // expect(content.events).toHaveLength(38)
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
