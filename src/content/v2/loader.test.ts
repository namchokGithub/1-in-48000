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

/**
 * Live content without its stat rules, for tests that check story routes:
 * per-period changes and stat endings would otherwise end those runs early.
 */
function withoutStatRules<T extends { config: object }>(content: T): T {
  return {
    ...content,
    config: { ...content.config, periodChanges: [], statEndings: [] },
  }
}

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
    const content = withoutStatRules(
      await loadV2Content(
        async (path) =>
          files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
      ),
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

  it('keeps every year-two term-one choice recapped', () => {
    const ids = [
      'sophomore_welcome',
      'year_two_plans',
      'y2_term1_timetable_shuffle',
      'y2_term1_club_booth',
      'y2_term1_group_roles',
      'y2_term1_team_update',
      'y2_term1_budget_gap',
      'y2_term1_mali_practice',
      'y2_term1_midterm_week',
      'course_choice',
    ]
    const selected = events.filter((event) => ids.includes(event.id))
    expect(selected).toHaveLength(ids.length)
    for (const event of selected) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2)
      expect(event.choices.length).toBeLessThanOrEqual(4)
      expect(
        event.choices.every(
          (choice) => 'recap' in choice && Boolean(choice.recap),
        ),
      ).toBe(true)
    }
  })

  it('plays optional year-two term-one stories and reaches the break', async () => {
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
      choices: Record<string, string>,
    ) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 2, period: 'term1' },
        currentNodeId: 'n_sophomore_welcome',
        currentEventId: 'sophomore_welcome',
        flags,
      }
      const seen: string[] = []
      for (let step = 0; step < 12; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        if (event.id === 'y2_break_midterm_feedback') break
        seen.push(event.id)
        save =
          event.id === 'year_two_plans'
            ? chooseV2Many(content, save, ['review_notes', 'rest_well'])
            : chooseV2(content, save, choices[event.id])
      }
      expect(save.currentEventId).toBe('y2_break_midterm_feedback')
      expect(save.currentTime.period).toBe('break')
      return { seen, ledProject: save.flags.y2_led_project }
    }

    expect(
      play(
        { joined_club: true, met_mali: true },
        {
          sophomore_welcome: 'guide_newcomers',
          y2_term1_timetable_shuffle: 'check_room_changes',
          y2_term1_club_booth: 'help_at_booth',
          y2_term1_group_roles: 'coordinate_group',
          y2_term1_team_update: 'talk_to_teammate',
          y2_term1_budget_gap: 'use_digital_copy',
          y2_term1_mali_practice: 'practice_together',
          y2_term1_midterm_week: 'sleep_before_exam',
          course_choice: 'keep_balance',
        },
      ),
    ).toEqual({
      seen: [
        'sophomore_welcome',
        'year_two_plans',
        'y2_term1_timetable_shuffle',
        'y2_term1_club_booth',
        'y2_term1_group_roles',
        'y2_term1_team_update',
        'y2_term1_budget_gap',
        'y2_term1_mali_practice',
        'y2_term1_midterm_week',
        'course_choice',
      ],
      ledProject: true,
    })
    expect(
      play(
        {},
        {
          sophomore_welcome: 'prepare_classes',
          y2_term1_timetable_shuffle: 'ask_classmate',
          y2_term1_group_roles: 'take_defined_part',
          y2_term1_budget_gap: 'use_digital_copy',
          y2_term1_midterm_week: 'leave_exam_chat',
          course_choice: 'keep_balance',
        },
      ),
    ).toEqual({
      seen: [
        'sophomore_welcome',
        'year_two_plans',
        'y2_term1_timetable_shuffle',
        'y2_term1_group_roles',
        'y2_term1_budget_gap',
        'y2_term1_midterm_week',
        'course_choice',
      ],
      ledProject: undefined,
    })
  })

  it('keeps every first-summer choice recapped', () => {
    const summerIds = [
      'summer_job',
      'summer_canteen_rush',
      'summer_quiet_campus',
      'summer_skill_trial',
      'summer_workshop_followup',
      'summer_year_two_notice',
    ]
    const summerEvents = events.filter((event) => summerIds.includes(event.id))
    expect(summerEvents).toHaveLength(summerIds.length)
    for (const event of summerEvents) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2)
      expect(event.choices.length).toBeLessThanOrEqual(4)
      expect(
        event.choices.every(
          (choice) => 'recap' in choice && Boolean(choice.recap),
        ),
      ).toBe(true)
    }
  })

  it('plays first-summer side stories and rejoins year two', async () => {
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
    const play = (choices: Record<string, string>) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 1, period: 'summer' },
        currentNodeId: 'n_summer_job',
        currentEventId: 'summer_job',
      }
      const seen: string[] = []
      for (let step = 0; step < 8; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        if (event.id === 'sophomore_welcome') break
        seen.push(event.id)
        save = chooseV2(content, save, choices[event.id])
      }
      expect(save.currentEventId).toBe('sophomore_welcome')
      expect(save.currentTime.year).toBe(2)
      expect(save.currentTime.period).toBe('term1')
      return {
        seen,
        workedCanteen: save.flags.summer_worked_canteen,
        joinedWorkshop: save.flags.summer_joined_workshop,
      }
    }

    expect(
      play({
        summer_job: 'work_canteen',
        summer_canteen_rush: 'decline_extra_shift',
        summer_quiet_campus: 'walk_in_park',
        summer_skill_trial: 'join_workshop',
        summer_workshop_followup: 'give_feedback',
        summer_year_two_notice: 'check_new_schedule',
      }),
    ).toEqual({
      seen: [
        'summer_job',
        'summer_canteen_rush',
        'summer_quiet_campus',
        'summer_skill_trial',
        'summer_workshop_followup',
        'summer_year_two_notice',
      ],
      workedCanteen: true,
      joinedWorkshop: true,
    })
    expect(
      play({
        summer_job: 'rest_and_read',
        summer_quiet_campus: 'stay_in_room',
        summer_skill_trial: 'list_interests',
        summer_year_two_notice: 'leave_notification',
      }),
    ).toEqual({
      seen: [
        'summer_job',
        'summer_quiet_campus',
        'summer_skill_trial',
        'summer_year_two_notice',
      ],
      workedCanteen: undefined,
      joinedWorkshop: undefined,
    })
  })

  it('plays year-two break branches and enters term two', async () => {
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
    const content = withoutStatRules(
      await loadV2Content(
        async (path) =>
          files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
      ),
    )
    const play = (
      flags: Record<string, boolean>,
      choices: Record<string, string>,
    ) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 2, period: 'term1' },
        currentNodeId: 'n_course_choice',
        currentEventId: 'course_choice',
        flags,
      }
      save = chooseV2(content, save, 'keep_balance')
      expect(save.currentEventId).toBe('y2_break_midterm_feedback')
      expect(save.currentTime.period).toBe('break')

      const seen: string[] = []
      for (let step = 0; step < 10; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        if (event.id === 'y2_term2_return_routine') break
        seen.push(event.id)
        save = chooseV2(content, save, choices[event.id])
      }
      expect(save.currentEventId).toBe('y2_term2_return_routine')
      expect(save.currentTime.period).toBe('term2')
      return { seen, sentNotes: save.flags.y2_break_sent_notes }
    }

    expect(
      play(
        { met_mali: true },
        {
          y2_break_midterm_feedback: 'review_comments',
          y2_break_idle_morning: 'wash_laundry',
          y2_break_mali_checkin: 'reply_honestly',
          y2_break_notes_request: 'share_summary',
          y2_break_family_call: 'tell_them_truth',
          y2_break_notes_followup: 'answer_question',
          y2_break_last_evening: 'pack_essentials',
        },
      ),
    ).toEqual({
      seen: [
        'y2_break_midterm_feedback',
        'y2_break_idle_morning',
        'y2_break_mali_checkin',
        'y2_break_notes_request',
        'y2_break_family_call',
        'y2_break_notes_followup',
        'y2_break_last_evening',
      ],
      sentNotes: true,
    })
    expect(
      play(
        {},
        {
          y2_break_midterm_feedback: 'close_portal',
          y2_break_idle_morning: 'do_nothing',
          y2_break_notes_request: 'decline_gently',
          y2_break_family_call: 'ask_about_home',
          y2_break_last_evening: 'leave_for_morning',
        },
      ),
    ).toEqual({
      seen: [
        'y2_break_midterm_feedback',
        'y2_break_idle_morning',
        'y2_break_notes_request',
        'y2_break_family_call',
        'y2_break_last_evening',
      ],
      sentNotes: undefined,
    })
  })

  it('keeps every year-two term-two choice recapped', () => {
    const ids = [
      'y2_term2_return_routine',
      'group_research',
      'club_project',
      'y2_term2_field_notes',
      'y2_term2_workshop_method',
      'y2_term2_presentation',
      'y2_term2_feedback_reply',
      'y2_term2_exam_week',
      'y2_term2_term_review',
    ]
    const selected = events.filter((event) => ids.includes(event.id))
    expect(selected).toHaveLength(ids.length)
    for (const event of selected) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2)
      expect(event.choices.length).toBeLessThanOrEqual(4)
      expect(
        event.choices.every(
          (choice) => 'recap' in choice && Boolean(choice.recap),
        ),
      ).toBe(true)
    }
  })

  it('enters year-two term two before its stories and exits into summer', async () => {
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
      choices: Record<string, string>,
    ) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 2, period: 'break' },
        currentNodeId: 'n_y2_break_last_evening',
        currentEventId: 'y2_break_last_evening',
        flags,
      }
      save = chooseV2(content, save, 'pack_essentials')
      expect(save.currentEventId).toBe('y2_term2_return_routine')
      expect(save.currentTime.period).toBe('term2')

      const seen: string[] = []
      for (let step = 0; step < 12; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        if (event.id === 'internship_application') break
        seen.push(event.id)
        save = chooseV2(content, save, choices[event.id])
      }
      expect(save.currentEventId).toBe('internship_application')
      expect(save.currentTime.period).toBe('summer')
      return { seen, requestedFeedback: save.flags.y2_term2_requested_feedback }
    }

    expect(
      play(
        { joined_club: true, summer_joined_workshop: true },
        {
          y2_term2_return_routine: 'check_deadlines',
          group_research: 'listen_first',
          club_project: 'share_tasks',
          y2_term2_field_notes: 'ask_for_feedback',
          y2_term2_workshop_method: 'adapt_method',
          y2_term2_presentation: 'rehearse_with_group',
          y2_term2_feedback_reply: 'revise_section',
          y2_term2_exam_week: 'sleep_early',
          y2_term2_term_review: 'archive_notes',
        },
      ),
    ).toEqual({
      seen: [
        'y2_term2_return_routine',
        'group_research',
        'club_project',
        'y2_term2_field_notes',
        'y2_term2_workshop_method',
        'y2_term2_presentation',
        'y2_term2_feedback_reply',
        'y2_term2_exam_week',
        'y2_term2_term_review',
      ],
      requestedFeedback: true,
    })
    expect(
      play(
        {},
        {
          y2_term2_return_routine: 'leave_alarm',
          group_research: 'draft_quickly',
          y2_term2_field_notes: 'collect_sources',
          y2_term2_presentation: 'let_friend_present',
          y2_term2_exam_week: 'mute_group_chat',
          y2_term2_term_review: 'postpone_cleanup',
        },
      ),
    ).toEqual({
      seen: [
        'y2_term2_return_routine',
        'group_research',
        'y2_term2_field_notes',
        'y2_term2_presentation',
        'y2_term2_exam_week',
        'y2_term2_term_review',
      ],
      requestedFeedback: undefined,
    })
  })

  it('plays both summer work routes and optional peer follow-up into year three', async () => {
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
    const play = (choices: Record<string, string>) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 2, period: 'summer' },
        currentNodeId: 'n_internship_application',
        currentEventId: 'internship_application',
      }
      const seen: string[] = []
      for (let step = 0; step < 12; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        if (event.id === 'fieldwork_start') break
        seen.push(event.id)
        save = chooseV2(content, save, choices[event.id])
      }
      expect(save.currentEventId).toBe('fieldwork_start')
      expect(save.currentTime).toEqual({ year: 3, period: 'term1' })
      return {
        seen,
        applied: save.flags.applied_internship,
        helpedPeer: save.flags.y2_summer_helped_peer,
      }
    }

    expect(
      play({
        internship_application: 'apply_internship',
        y2_summer_application_followup: 'send_documents',
        y2_summer_calendar_collision: 'block_study_time',
        y2_summer_heat_route: 'carry_water',
        y2_summer_peer_request: 'help_outline',
        y2_summer_peer_followup: 'review_draft',
        y2_summer_portfolio_notes: 'record_lessons',
        y2_summer_last_week: 'check_year3_notice',
      }),
    ).toEqual({
      seen: [
        'internship_application',
        'y2_summer_application_followup',
        'y2_summer_calendar_collision',
        'y2_summer_heat_route',
        'y2_summer_peer_request',
        'y2_summer_peer_followup',
        'y2_summer_portfolio_notes',
        'y2_summer_last_week',
      ],
      applied: true,
      helpedPeer: true,
    })
    expect(
      play({
        internship_application: 'take_paid_work',
        y2_summer_paid_shift: 'keep_regular_hours',
        y2_summer_calendar_collision: 'drop_plan',
        y2_summer_heat_route: 'wait_out_heat',
        y2_summer_peer_request: 'decline_politely',
        y2_summer_portfolio_notes: 'leave_blank',
        y2_summer_last_week: 'sleep_in',
      }),
    ).toEqual({
      seen: [
        'internship_application',
        'y2_summer_paid_shift',
        'y2_summer_calendar_collision',
        'y2_summer_heat_route',
        'y2_summer_peer_request',
        'y2_summer_portfolio_notes',
        'y2_summer_last_week',
      ],
      applied: undefined,
      helpedPeer: undefined,
    })
  })

  it('keeps every six-year program choice recapped', () => {
    const sixYear = (events as { id: string }[]).filter((event) =>
      event.id.startsWith('six_'),
    ) as unknown as {
      id: string
      choices: { id: string; recap?: string }[]
    }[]
    expect(sixYear).toHaveLength(40)
    for (const event of sixYear)
      for (const choice of event.choices)
        expect(choice.recap, `${event.id}/${choice.id}`).toBeTruthy()
  })

  it('gives six-year students their own Years 5-6 and reviews them at Year 6', async () => {
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
    const loaded = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    // This checks the Year 6 review route, so stat endings that would end a
    // low-study run earlier are left out.
    const content = {
      ...loaded,
      config: { ...loaded.config, statEndings: [] },
    }
    const play = (majorId: string, study: number) => {
      const major = content.majors.find((item) => item.id === majorId)!
      let save = createV2Game(content, 42)
      save = {
        ...save,
        facultyId: major.facultyId,
        majorId: major.id,
        currentTime: { year: 4, period: 'summer' },
        currentNodeId: 'n_graduation_day',
        currentEventId: 'graduation_day',
        stats: { ...save.stats, study, stress: 0 },
        flags: {},
      }
      save = chooseV2(content, save, 'look_ahead')
      const seen: string[] = []
      for (let step = 0; step < 60; step += 1) {
        const event = getV2CurrentEvent(content, save)
        if (!event || !event.id.startsWith('six_')) break
        seen.push(event.id)
        save = chooseV2(content, save, getV2AvailableChoices(event, save)[0].id)
      }
      return { seen, save }
    }

    const facultyScenes: Record<string, string[]> = {
      medicine: ['six_y5_term1_med_ward', 'six_y6_term2_med_night_call'],
      clinical_medicine: [
        'six_y5_term1_med_ward',
        'six_y6_term2_med_night_call',
      ],
      pharmacy: [
        'six_y5_term1_pharm_counter',
        'six_y6_term2_pharm_interaction',
      ],
      dentistry: ['six_y5_term1_dent_chair', 'six_y6_term2_dent_requirement'],
      nautical_science: ['six_y5_term1_naut_deck', 'six_y6_term2_naut_storm'],
    }
    for (const [majorId, scenes] of Object.entries(facultyScenes)) {
      const passed = play(majorId, 100)
      expect(passed.seen[0]).toBe('six_y5_term1_white_coat')
      expect(passed.seen).toEqual(expect.arrayContaining(scenes))
      expect(
        passed.seen.filter(
          (id) => /_(med|pharm|dent|naut)_/.test(id) && !scenes.includes(id),
        ),
      ).toEqual([])
      expect(passed.seen.at(-1)).toBe('six_y6_summer_result_eve')
      expect(passed.save.endingId).not.toBeNull()
      expect(passed.save.endingId).not.toBe('dismissal')
    }

    const failed = play('medicine', 0)
    expect(failed.save.endingId).toBeNull()
    expect(failed.save.currentEventId).toBe('extra_y7_term1_new_cohort')
    expect(failed.save.currentTime).toEqual({ year: 7, period: 'term1' })
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
    for (let step = 0; step < 300 && !save.endingId; step += 1) {
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
    const content = withoutStatRules(
      await loadV2Content(
        async (path) =>
          files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
      ),
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
