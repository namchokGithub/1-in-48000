import { describe, expect, it } from 'vitest'
import sample from '../../content/v2/sample-content.json'
import names from '../../../public/content-v2/names.json'
import {
  v2EventSchema,
  v2ContentSchema,
  v2GameConfigSchema,
  type V2Event,
} from '../../content/v2/schema'
import {
  chooseV2,
  chooseV2Elective,
  chooseV2Many,
  chooseV2Program,
  createV2Game,
  getV2EffectiveChancePercent,
  pickV2StartOption,
  getV2CurrentEvent,
  summarizeV2Life,
  type V2GameContent,
} from './game'

const sampleContent = v2ContentSchema.parse({ ...sample, names })

function event(
  id: string,
  year: number,
  effects: V2Event['choices'][number]['effects'] = [],
): V2Event {
  return v2EventSchema.parse({
    id,
    kind: 'main',
    time: { year, period: 'term1' },
    title: id,
    conditions: [],
    lines: [{ text: id }],
    choices: [{ id: 'continue_story', text: 'ต่อไป', conditions: [], effects }],
  })
}

function game(
  events: V2Event[],
  stats: Record<string, number> = {},
): V2GameContent {
  return {
    config: v2GameConfigSchema.parse({
      ...sample.config,
      startingEventId: events[0].id,
      initialStats: { ...sample.config.initialStats, ...stats },
    }),
    events,
    names,
    faculties: sampleContent.faculties,
    majors: sampleContent.majors,
    electives: sampleContent.electives,
    endings: [
      {
        id: 'study_complete',
        title: 'เรียนจบ',
        summary: 'เรียนสำเร็จ',
        conditions: [],
      },
      {
        id: 'dismissal',
        title: 'พ้นสภาพนักศึกษา',
        summary: 'ต้องเริ่มทางใหม่',
        conditions: [],
      },
    ],
  }
}

describe('V2 headless engine', () => {
  it('picks a start option from a supplied random value', () => {
    expect(pickV2StartOption(['ฟ้า', 'มายด์', 'อิม'], 4)).toBe('มายด์')
    expect(() => pickV2StartOption([], 0)).toThrow('No starting options')
  })
  it('skips inactive stories during progression', () => {
    const content = game([
      event('start', 1),
      { ...event('hidden_event', 1), active: false },
      event('next_event', 1),
    ])
    const next = chooseV2(content, createV2Game(content, 1), 'continue_story')
    expect(next.currentEventId).toBe('next_event')
  })

  it('allows negative stats and debt while keeping bounded upper limits', () => {
    const content = game(
      [
        event('start', 1, [
          { type: 'statDelta', stat: 'money', amount: -2000 },
          { type: 'statDelta', stat: 'debt', amount: 500 },
          { type: 'statDelta', stat: 'health', amount: -1000 },
          { type: 'statDelta', stat: 'lucky', amount: -50 },
          { type: 'statDelta', stat: 'study', amount: 100 },
        ]),
      ],
      { money: 100, lucky: 10 },
    )
    const next = chooseV2(content, createV2Game(content, 7), 'continue_story')
    expect(next.stats).toMatchObject({
      money: -1900,
      debt: 500,
      health: -920,
      lucky: -40,
      study: 100,
    })
  })

  it('uses lucky in a saved chance roll and replays the same outcome', () => {
    expect(getV2EffectiveChancePercent(3, 10)).toBe(4)
    expect(getV2EffectiveChancePercent(99, 20)).toBe(100)
    expect(getV2EffectiveChancePercent(1, -20)).toBe(0)
    const chance = {
      type: 'chance' as const,
      successPercent: 3,
      displayMode: 'statsOnly' as const,
      successEffects: [
        { type: 'statDelta' as const, stat: 'money' as const, amount: 1000 },
      ],
      failureEffects: [],
    }
    const luckyGame = game([event('lottery', 1, [chance])], { lucky: 10 })
    const checkpoint = createV2Game(luckyGame, 8)
    const won = chooseV2(luckyGame, checkpoint, 'continue_story')
    const replay = chooseV2(
      luckyGame,
      structuredClone(checkpoint),
      'continue_story',
    )
    expect(won.stats.money).toBe(2200)
    expect(won.history[0].chanceOutcomes).toEqual([
      { effectIndex: 0, succeeded: true, effectivePercent: 4 },
    ])
    expect(won.rngState).not.toBe(checkpoint.rngState)
    expect(replay).toEqual(won)

    const ordinaryGame = game([event('lottery', 1, [chance])], { lucky: 0 })
    const lost = chooseV2(
      ordinaryGame,
      createV2Game(ordinaryGame, 2049),
      'continue_story',
    )
    expect(lost.stats.money).toBe(1200)
    expect(lost.history[0].chanceOutcomes[0].effectivePercent).toBe(3)
    expect(lost.history[0].chanceOutcomes[0].succeeded).toBe(false)
  })

  it('keeps fractional chance percentages below 0.01% accurate', () => {
    const content = game(
      [
        event('tiny_chance', 1, [
          {
            type: 'chance',
            successPercent: 0.001,
            displayMode: 'amounts',
            successEffects: [{ type: 'statDelta', stat: 'money', amount: 100 }],
            failureEffects: [],
          },
        ]),
      ],
      { lucky: 0 },
    )
    const result = chooseV2(
      content,
      createV2Game(content, 7132),
      'continue_story',
    )
    expect(result.history[0].chanceOutcomes[0].succeeded).toBe(false)
    expect(result.stats.money).toBe(1200)
  })

  it('graduates at year 4 when study minus one tenth of stress is at least 60', () => {
    const content = game([event('start', 1)], { study: 62, stress: 20 })
    const ended = chooseV2(content, createV2Game(content, 1), 'continue_story')
    expect(ended.endingId).toBe('study_complete')
    expect(ended.currentTime).toEqual({ year: 4, period: 'summer' })
  })

  it('continues to year 5 and graduates at year 6 after raising study', () => {
    const content = game(
      [
        event('start', 1),
        event('second_chance', 5, [
          { type: 'statDelta', stat: 'study', amount: 15 },
        ]),
      ],
      { study: 50, stress: 0 },
    )
    const yearFive = chooseV2(
      content,
      createV2Game(content, 1),
      'continue_story',
    )
    expect(yearFive.currentEventId).toBe('second_chance')
    expect(yearFive.currentTime).toEqual({ year: 5, period: 'term1' })
    const ended = chooseV2(content, yearFive, 'continue_story')
    expect(ended.endingId).toBe('study_complete')
    expect(ended.currentTime).toEqual({ year: 6, period: 'summer' })
  })

  it('continues through year 7 and dismisses a failing student after year 8', () => {
    const content = game([event('start', 1), event('last_try', 7)], {
      study: 50,
      stress: 0,
    })
    const yearSeven = chooseV2(
      content,
      createV2Game(content, 1),
      'continue_story',
    )
    expect(yearSeven.currentEventId).toBe('last_try')
    const ended = chooseV2(content, yearSeven, 'continue_story')
    expect(ended.endingId).toBe('dismissal')
    expect(ended.currentTime).toEqual({ year: 8, period: 'summer' })
  })

  it('can pass at year 8 after a delayed study gain', () => {
    const content = game(
      [
        event('start', 1, [
          {
            type: 'schedule',
            trigger: { type: 'atPeriod', time: { year: 8, period: 'term1' } },
            effect: { type: 'statDelta', stat: 'study', amount: 15 },
          },
        ]),
      ],
      { study: 50, stress: 0 },
    )
    const ended = chooseV2(content, createV2Game(content, 1), 'continue_story')
    expect(ended.stats.study).toBe(65)
    expect(ended.pendingEffects).toEqual([])
    expect(ended.endingId).toBe('study_complete')
    expect(ended.currentTime).toEqual({ year: 8, period: 'summer' })
  })

  it('records event, choice, time, and outcome for the life timeline', () => {
    const content = game([event('start', 1)], { study: 70 })
    const checkpoint = createV2Game(content, 1)
    expect(getV2CurrentEvent(content, checkpoint)?.id).toBe('start')
    const ended = chooseV2(content, checkpoint, 'continue_story')
    const summary = summarizeV2Life(content, ended)
    expect(summary.timeline).toEqual([
      {
        time: { year: 1, period: 'term1' },
        eventId: 'start',
        eventTitle: 'start',
        choiceIds: ['continue_story'],
        choiceText: 'ต่อไป',
        chanceOutcomes: [],
      },
    ])
    expect(summary.title).toBe('เรียนจบ')
  })

  it('selects a valid faculty and major at the fixed start and records the pair', () => {
    const save = createV2Game(sampleContent, 5)
    expect(save.currentEventId).toBe('choose_program')
    expect(save.playerName).toBe(
      names.find((entry) => entry.id === save.nameId)?.name,
    )
    expect(() => chooseV2(sampleContent, save, 'confirm_program')).toThrow()
    expect(() =>
      chooseV2Program(sampleContent, save, 'humanities', 'medicine'),
    ).toThrow()
    const chosen = chooseV2Program(sampleContent, save, 'medicine', 'medicine')
    expect(chosen.currentEventId).toBe('student_loan')
    expect(chosen.facultyId).toBe('medicine')
    expect(chosen.majorId).toBe('medicine')
    expect(chosen.history[0]).toMatchObject({
      facultyId: 'medicine',
      majorId: 'medicine',
    })
    expect(save.facultyId).toBeNull()
  })

  it('combines selected choices in authored order and follows one event link', () => {
    const multi = v2EventSchema.parse({
      ...event('multi', 1),
      selection: { type: 'multiple', min: 2, max: 3, goToEventId: 'target' },
      choices: [
        {
          id: 'study',
          text: 'อ่านหนังสือ',
          conditions: [],
          effects: [{ type: 'statDelta', stat: 'study', amount: 5 }],
        },
        {
          id: 'flag',
          text: 'ช่วยเพื่อน',
          conditions: [],
          effects: [{ type: 'setFlag', flagId: 'helped', value: true }],
        },
        {
          id: 'money',
          text: 'ทำงาน',
          conditions: [],
          effects: [{ type: 'statDelta', stat: 'money', amount: 100 }],
        },
      ],
    })
    const target = {
      ...event('target', 1),
      conditions: [{ type: 'flag' as const, flagId: 'helped', value: true }],
    }
    const content = game([multi, target])
    const save = createV2Game(content, 1)
    expect(() => chooseV2(content, save, 'study')).toThrow()
    expect(() => chooseV2Many(content, save, ['study'])).toThrow()
    expect(() => chooseV2Many(content, save, ['study', 'study'])).toThrow()
    expect(() =>
      chooseV2Many(content, save, ['study', 'flag', 'money', 'extra']),
    ).toThrow()
    const next = chooseV2Many(content, save, ['flag', 'study'])
    expect(next.currentEventId).toBe('target')
    expect(next.stats.study).toBe(save.stats.study + 5)
    expect(next.flags.helped).toBe(true)
    expect(next.history[0].choiceIds).toEqual(['study', 'flag'])
  })

  it('applies a Year 3 elective and its condition, then records it for the summary', () => {
    const electiveEvent = v2EventSchema.parse({
      ...event('elective_event', 3),
      selection: { type: 'elective' },
    })
    const later = {
      ...event('later', 3),
      conditions: [
        { type: 'elective' as const, electiveId: 'creative_writing' },
      ],
    }
    const content = game([electiveEvent, later], { study: 70 })
    content.config.startingTime = { year: 3, period: 'term1' }
    const save = createV2Game(content, 2)
    expect(() => chooseV2Elective(content, save, 'missing')).toThrow()
    const chosen = chooseV2Elective(content, save, 'creative_writing')
    expect(chosen.stats.study).toBe(save.stats.study + 2)
    expect(chosen.electiveId).toBe('creative_writing')
    expect(chosen.currentEventId).toBe('later')
    expect(chosen.history[0].electiveId).toBe('creative_writing')
    const ended = chooseV2(content, chosen, 'continue_story')
    expect(summarizeV2Life(content, ended).timeline[0].choiceText).toBe(
      'การเขียนสร้างสรรค์',
    )
  })

  it('reviews a six-year program at Year 6, then extends failure to Year 8', () => {
    const program = v2EventSchema.parse({
      ...event('program', 1, [{ type: 'goToEvent', eventId: 'year_five' }]),
      selection: { type: 'program' },
    })
    const content = game([program, event('year_five', 5)], {
      study: 70,
      stress: 0,
    })
    const started = chooseV2Program(
      content,
      createV2Game(content, 3),
      'medicine',
      'medicine',
    )
    expect(started.currentTime).toEqual({ year: 5, period: 'term1' })
    expect(started.endingId).toBeNull()
    const graduated = chooseV2(content, started, 'continue_story')
    expect(graduated.endingId).toBe('study_complete')
    expect(graduated.currentTime).toEqual({ year: 6, period: 'summer' })

    const failing = game(
      [program, event('year_five', 5), event('year_seven', 7)],
      { study: 50, stress: 0 },
    )
    const yearFive = chooseV2Program(
      failing,
      createV2Game(failing, 4),
      'medicine',
      'medicine',
    )
    const yearSeven = chooseV2(failing, yearFive, 'continue_story')
    expect(yearSeven.currentEventId).toBe('year_seven')
    const dismissed = chooseV2(failing, yearSeven, 'continue_story')
    expect(dismissed.endingId).toBe('dismissal')
    expect(dismissed.currentTime).toEqual({ year: 8, period: 'summer' })
  })

  it('reviews a selected four-year major at Year 4 and extends failure to Year 6', () => {
    const program = v2EventSchema.parse({
      ...event('program', 1, [{ type: 'goToEvent', eventId: 'year_five' }]),
      selection: { type: 'program' },
    })
    const content = game(
      [
        program,
        event('year_five', 5, [
          { type: 'statDelta', stat: 'study', amount: 15 },
        ]),
      ],
      { study: 50, stress: 0 },
    )
    const yearFive = chooseV2Program(
      content,
      createV2Game(content, 6),
      'humanities',
      'thai_language',
    )
    expect(yearFive.currentTime).toEqual({ year: 5, period: 'term1' })
    const graduated = chooseV2(content, yearFive, 'continue_story')
    expect(graduated.endingId).toBe('study_complete')
    expect(graduated.currentTime).toEqual({ year: 6, period: 'summer' })
  })

  it('applies an elective flag before evaluating later conditions', () => {
    const electiveEvent = v2EventSchema.parse({
      ...event('elective_event', 3),
      selection: { type: 'elective' },
    })
    const later = {
      ...event('later', 3),
      conditions: [
        { type: 'flag' as const, flagId: 'volunteered', value: true },
      ],
    }
    const content = game([electiveEvent, later])
    content.config.startingTime = { year: 3, period: 'term1' }
    content.electives = [
      {
        id: 'volunteering',
        name: 'จิตอาสา',
        effects: [{ type: 'setFlag', flagId: 'volunteered', value: true }],
      },
    ]
    const chosen = chooseV2Elective(
      content,
      createV2Game(content, 7),
      'volunteering',
    )
    expect(chosen.flags.volunteered).toBe(true)
    expect(chosen.currentEventId).toBe('later')
  })
})
