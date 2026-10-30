import { describe, expect, it } from 'vitest'
import sample from '../../content/v2/sample-content.json'
import sampleFlow from '../../content/v2/sample-flow.json'
import names from '../../../public/content-v2/names.json'
import {
  v2EventSchema,
  v2ContentSchema,
  v2GameConfigSchema,
  type V2Content,
  type V2Event,
} from '../../content/v2/schema'
import {
  chooseV2,
  chooseV2Elective,
  chooseV2Many,
  chooseV2Program,
  createV2Game,
  getV2EffectiveChancePercent,
  getV2GoalYear,
  pickV2StartOption,
  previewV2Name,
  getV2CurrentEvent,
  summarizeV2Life,
  type V2FlowStep,
  type V2GameContent,
} from './game'

type Flow = V2Content['flow']
type FlowNode = Flow['nodes'][number]
type FlowEdge = Flow['edges'][number]

const sampleContent = v2ContentSchema.parse({
  ...sample,
  names,
  flow: sampleFlow,
})
const at = { x: 0, y: 0 }

function event(
  id: string,
  effects: V2Event['choices'][number]['effects'] = [],
  choiceIds = ['continue_story'],
): V2Event {
  return v2EventSchema.parse({
    id,
    kind: 'main',
    time: { year: 1, period: 'term1' },
    title: id,
    conditions: [],
    lines: [{ text: id }],
    choices: choiceIds.map((choiceId) => ({
      id: choiceId,
      text: choiceId === 'continue_story' ? 'ต่อไป' : choiceId,
      conditions: [],
      effects,
    })),
  })
}

function eventNode(eventId: string): FlowNode {
  return { id: eventId, type: 'event', eventId, position: at }
}

function ending(id: string): FlowNode {
  return { id: `end_${id}`, type: 'ending', endingId: id, position: at }
}

function edge(
  from: string,
  port: string,
  to: string,
  condition?: FlowEdge['condition'],
): FlowEdge {
  return {
    id: `${from}_${port}_${to}`,
    from,
    port,
    to,
    ...(condition ? { condition } : {}),
  }
}

function game(
  events: V2Event[],
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: {
    stats?: Record<string, number>
    startingTime?: V2GameContent['config']['startingTime']
  } = {},
): V2GameContent {
  return {
    config: v2GameConfigSchema.parse({
      ...sample.config,
      startingTime: options.startingTime ?? sample.config.startingTime,
      initialStats: { ...sample.config.initialStats, ...options.stats },
    }),
    events,
    names,
    faculties: sampleContent.faculties,
    majors: sampleContent.majors,
    electives: sampleContent.electives,
    endings: [
      { id: 'study_complete', title: 'เรียนจบ', summary: 'เรียนสำเร็จ' },
      {
        id: 'dismissal',
        title: 'พ้นสภาพนักศึกษา',
        summary: 'ต้องเริ่มทางใหม่',
      },
    ],
    flow: {
      nodes: [{ id: 'start', type: 'start', position: at }, ...nodes],
      edges: [edge('start', 'next', nodes[0].id), ...edges],
    },
  }
}

function single(events: V2Event[]): V2GameContent {
  const done = ending('study_complete')
  return game(
    events,
    [...events.map((item) => eventNode(item.id)), done],
    events.map((item, index) =>
      edge(item.id, 'continue_story', events[index + 1]?.id ?? done.id),
    ),
  )
}

function reviewGame(
  stats: Record<string, number>,
  startingTime: V2GameContent['config']['startingTime'],
  first: V2Event = event('opening'),
): V2GameContent {
  const port = first.selection ? 'next' : 'continue_story'
  return game(
    [first],
    [
      eventNode(first.id),
      { id: 'next_period', type: 'nextPeriod', position: at },
      ending('study_complete'),
    ],
    [
      edge(first.id, port, 'next_period'),
      edge('next_period', 'next', 'next_period'),
      edge('next_period', 'extend', 'next_period'),
      edge('next_period', 'graduate', 'end_study_complete'),
    ],
    { stats, startingTime },
  )
}

describe('V4 flow engine', () => {
  it('picks a start option from a supplied random value', () => {
    expect(pickV2StartOption(['ฟ้า', 'มายด์', 'อิม'], 4)).toBe('มายด์')
    expect(() => pickV2StartOption([], 0)).toThrow('No starting options')
  })

  it('previews the same player name the game starts with', () => {
    for (const seed of [0, 1, 2, 7, 4_294_967_295]) {
      expect(previewV2Name(sampleContent, seed).id).toBe(
        createV2Game(sampleContent, seed).nameId,
      )
    }
  })

  it('aims at the program length, then at each study review year', () => {
    expect(getV2GoalYear(4, 1)).toBe(4)
    expect(getV2GoalYear(4, 4)).toBe(4)
    expect(getV2GoalYear(4, 5)).toBe(6)
    expect(getV2GoalYear(4, 7)).toBe(8)
    expect(getV2GoalYear(6, 1)).toBe(6)
    expect(getV2GoalYear(6, 6)).toBe(6)
    expect(getV2GoalYear(6, 7)).toBe(8)
  })

  it('starts at the first event linked from Start', () => {
    const content = single([event('first'), event('second')])
    const save = createV2Game(content, 1)
    expect(save.currentNodeId).toBe('first')
    expect(getV2CurrentEvent(content, save)?.id).toBe('first')
  })

  it('follows each choice edge and lets paths merge into one event', () => {
    const content = game(
      [
        event('fork', [], ['left', 'right']),
        event('a'),
        event('b'),
        event('merge'),
      ],
      ['fork', 'a', 'b', 'merge']
        .map(eventNode)
        .concat(ending('study_complete')),
      [
        edge('fork', 'left', 'a'),
        edge('fork', 'right', 'b'),
        edge('a', 'continue_story', 'merge'),
        edge('b', 'continue_story', 'merge'),
        edge('merge', 'continue_story', 'end_study_complete'),
      ],
    )
    const left = chooseV2(content, createV2Game(content, 1), 'left')
    const right = chooseV2(content, createV2Game(content, 1), 'right')
    expect(left.currentEventId).toBe('a')
    expect(right.currentEventId).toBe('b')
    expect(chooseV2(content, left, 'continue_story').currentEventId).toBe(
      'merge',
    )
    expect(chooseV2(content, right, 'continue_story').currentEventId).toBe(
      'merge',
    )
  })

  it('takes the first edge whose condition holds, in file order', () => {
    const helped = { type: 'flag' as const, flagId: 'helped', value: true }
    const content = game(
      [
        event('opening', [], ['help', 'ignore']),
        event('thanks'),
        event('alone'),
      ],
      ['opening', 'thanks', 'alone']
        .map(eventNode)
        .concat(ending('study_complete')),
      [
        edge('opening', 'help', 'thanks', helped),
        edge('opening', 'help', 'alone'),
        edge('opening', 'ignore', 'thanks', helped),
        edge('opening', 'ignore', 'alone'),
      ],
    )
    content.events[0].choices[0].effects = [
      { type: 'setFlag', flagId: 'helped', value: true },
    ]
    const save = createV2Game(content, 1)
    expect(chooseV2(content, save, 'help').currentEventId).toBe('thanks')
    expect(chooseV2(content, save, 'ignore').currentEventId).toBe('alone')
  })

  it('throws when no edge leaves the chosen port', () => {
    const content = game(
      [event('opening', [], ['left', 'right']), event('a')],
      [eventNode('opening'), eventNode('a')],
      [edge('opening', 'left', 'a')],
    )
    expect(() => chooseV2(content, createV2Game(content, 1), 'right')).toThrow(
      'No path from opening (right)',
    )
  })

  it('evaluates AND and OR Condition nodes against the latest state', () => {
    const conditions = [
      {
        type: 'stat' as const,
        stat: 'money' as const,
        operator: 'gte' as const,
        value: 1000,
      },
      { type: 'flag' as const, flagId: 'rich', value: true },
    ]
    const build = (join: 'and' | 'or') =>
      game(
        [event('opening'), event('pass'), event('fail')],
        [
          eventNode('opening'),
          { id: 'check', type: 'condition', join, conditions, position: at },
          eventNode('pass'),
          eventNode('fail'),
        ],
        [
          edge('opening', 'continue_story', 'check'),
          edge('check', 'pass', 'pass'),
          edge('check', 'fail', 'fail'),
        ],
        { stats: { money: 1200 } },
      )
    const and = build('and')
    expect(
      chooseV2(and, createV2Game(and, 1), 'continue_story').currentEventId,
    ).toBe('fail')
    const or = build('or')
    expect(
      chooseV2(or, createV2Game(or, 1), 'continue_story').currentEventId,
    ).toBe('pass')
  })

  it('rolls one eligible pool event with the saved seed and continues on after', () => {
    const pooled = (id: string, conditions: V2Event['conditions'] = []) => ({
      ...event(id),
      pool: 'daily_life',
      conditions,
    })
    const content = game(
      [
        event('opening'),
        pooled('rain'),
        pooled('friend'),
        pooled('locked', [{ type: 'flag', flagId: 'never', value: true }]),
        event('dorm'),
      ],
      [
        eventNode('opening'),
        { id: 'daily', type: 'random', poolId: 'daily_life', position: at },
        eventNode('dorm'),
        { id: 'empty', type: 'random', poolId: 'daily_life', position: at },
        ending('study_complete'),
      ],
      [
        edge('opening', 'continue_story', 'daily'),
        edge('daily', 'after', 'dorm'),
        edge('daily', 'fallback', 'dorm'),
        edge('dorm', 'continue_story', 'empty'),
        edge('empty', 'after', 'end_study_complete'),
        edge('empty', 'fallback', 'end_study_complete'),
      ],
    )
    const checkpoint = createV2Game(content, 3)
    const rolled = chooseV2(content, checkpoint, 'continue_story')
    expect(['rain', 'friend']).toContain(rolled.currentEventId)
    expect(rolled.currentNodeId).toBe('daily')
    expect(rolled.rngState).not.toBe(checkpoint.rngState)
    expect(
      chooseV2(content, structuredClone(checkpoint), 'continue_story'),
    ).toEqual(rolled)
    const afterPool = chooseV2(content, rolled, 'continue_story')
    expect(afterPool.currentEventId).toBe('dorm')
    const second = chooseV2(content, afterPool, 'continue_story')
    expect(['rain', 'friend']).toContain(second.currentEventId)
    expect(second.currentEventId).not.toBe(rolled.currentEventId)
    const done = chooseV2(content, second, 'continue_story')
    expect(done.endingId).toBe('study_complete')

    const emptyPool = structuredClone(content)
    emptyPool.events = emptyPool.events.filter((item) => !item.pool)
    expect(
      chooseV2(emptyPool, createV2Game(emptyPool, 3), 'continue_story')
        .currentEventId,
    ).toBe('dorm')
  })

  it('advances one period per Next Period node and applies due delayed effects', () => {
    const content = game(
      [
        event('opening', [
          {
            type: 'schedule',
            trigger: { type: 'atPeriod', time: { year: 1, period: 'break' } },
            effect: { type: 'statDelta', stat: 'study', amount: 5 },
          },
        ]),
        event('break_time'),
      ],
      [
        eventNode('opening'),
        { id: 'to_break', type: 'nextPeriod', position: at },
        eventNode('break_time'),
      ],
      [
        edge('opening', 'continue_story', 'to_break'),
        edge('to_break', 'next', 'break_time'),
      ],
    )
    const save = createV2Game(content, 1)
    const next = chooseV2(content, save, 'continue_story')
    expect(next.currentTime).toEqual({ year: 1, period: 'break' })
    expect(next.stats.study).toBe(save.stats.study + 5)
    expect(next.pendingEffects).toEqual([])
  })

  it('allows negative stats and debt while keeping bounded upper limits', () => {
    const content = single([
      event('opening', [
        { type: 'statDelta', stat: 'money', amount: -2000 },
        { type: 'statDelta', stat: 'debt', amount: 500 },
        { type: 'statDelta', stat: 'health', amount: -1000 },
        { type: 'statDelta', stat: 'lucky', amount: -50 },
        { type: 'statDelta', stat: 'study', amount: 100 },
      ]),
    ])
    content.config.initialStats = {
      ...content.config.initialStats,
      money: 100,
      lucky: 10,
    }
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
    const luckyGame = single([event('lottery', [chance])])
    luckyGame.config.initialStats.lucky = 10
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

    const ordinaryGame = single([event('lottery', [chance])])
    ordinaryGame.config.initialStats.lucky = 0
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
    const content = single([
      event('tiny_chance', [
        {
          type: 'chance',
          successPercent: 0.001,
          displayMode: 'amounts',
          successEffects: [{ type: 'statDelta', stat: 'money', amount: 100 }],
          failureEffects: [],
        },
      ]),
    ])
    content.config.initialStats.lucky = 0
    const result = chooseV2(
      content,
      createV2Game(content, 7132),
      'continue_story',
    )
    expect(result.history[0].chanceOutcomes[0].succeeded).toBe(false)
    expect(result.stats.money).toBe(1200)
  })

  it('graduates at the Year 4 review when study minus one tenth of stress is at least 60', () => {
    const content = reviewGame(
      { study: 62, stress: 20 },
      { year: 4, period: 'summer' },
    )
    const ended = chooseV2(content, createV2Game(content, 1), 'continue_story')
    expect(ended.endingId).toBe('study_complete')
    expect(ended.currentTime).toEqual({ year: 4, period: 'summer' })
  })

  it('extends a failed Year 4 review through Year 7 and dismisses after Year 8', () => {
    const content = reviewGame(
      { study: 50, stress: 0 },
      { year: 4, period: 'summer' },
    )
    const ended = chooseV2(content, createV2Game(content, 1), 'continue_story')
    expect(ended.endingId).toBe('dismissal')
    expect(ended.currentTime).toEqual({ year: 8, period: 'summer' })
  })

  it('can pass a later review after a delayed study gain', () => {
    const content = reviewGame(
      { study: 50, stress: 0 },
      { year: 4, period: 'summer' },
      event('opening', [
        {
          type: 'schedule',
          trigger: { type: 'atPeriod', time: { year: 6, period: 'term1' } },
          effect: { type: 'statDelta', stat: 'study', amount: 15 },
        },
      ]),
    )
    const ended = chooseV2(content, createV2Game(content, 1), 'continue_story')
    expect(ended.stats.study).toBe(65)
    expect(ended.pendingEffects).toEqual([])
    expect(ended.endingId).toBe('study_complete')
    expect(ended.currentTime).toEqual({ year: 6, period: 'summer' })
  })

  it('skips the Year 4 review for a six-year program and reviews at Year 6', () => {
    const program = v2EventSchema.parse({
      ...event('program'),
      selection: { type: 'program' },
    })
    const content = reviewGame(
      { study: 70, stress: 0 },
      { year: 4, period: 'summer' },
      program,
    )
    const graduated = chooseV2Program(
      content,
      createV2Game(content, 3),
      'medicine',
      'medicine',
    )
    expect(graduated.endingId).toBe('study_complete')
    expect(graduated.currentTime).toEqual({ year: 6, period: 'summer' })

    const fourYear = chooseV2Program(
      content,
      createV2Game(content, 3),
      'humanities',
      'thai_language',
    )
    expect(fourYear.currentTime).toEqual({ year: 4, period: 'summer' })
  })

  it('records event, choice, time, and outcome for the life timeline', () => {
    const content = single([event('opening')])
    const checkpoint = createV2Game(content, 1)
    const ended = chooseV2(content, checkpoint, 'continue_story')
    const summary = summarizeV2Life(content, ended)
    expect(summary.timeline).toEqual([
      {
        time: { year: 1, period: 'term1' },
        eventId: 'opening',
        eventTitle: 'opening',
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

  it('combines selected choices in authored order and follows the event edge', () => {
    const multi = v2EventSchema.parse({
      ...event('multi'),
      selection: { type: 'multiple', min: 2, max: 3 },
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
    const content = game(
      [multi, event('target'), event('other')],
      [eventNode('multi'), eventNode('target'), eventNode('other')],
      [
        edge('multi', 'next', 'target', {
          type: 'flag',
          flagId: 'helped',
          value: true,
        }),
        edge('multi', 'next', 'other'),
      ],
    )
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
    expect(chooseV2Many(content, save, ['study', 'money']).currentEventId).toBe(
      'other',
    )
  })

  it('applies a Year 3 elective before evaluating later edges and records it', () => {
    const electiveEvent = v2EventSchema.parse({
      ...event('elective_event'),
      selection: { type: 'elective' },
    })
    const content = game(
      [electiveEvent, event('later'), event('other')],
      [
        eventNode('elective_event'),
        eventNode('later'),
        eventNode('other'),
        ending('study_complete'),
      ],
      [
        edge('elective_event', 'next', 'later', {
          type: 'elective',
          electiveId: 'creative_writing',
        }),
        edge('elective_event', 'next', 'other'),
        edge('later', 'continue_story', 'end_study_complete'),
      ],
      { startingTime: { year: 3, period: 'term1' } },
    )
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

    const yearTwo = { ...content, config: { ...content.config } }
    yearTwo.config.startingTime = { year: 2, period: 'term1' }
    expect(() =>
      chooseV2Elective(yearTwo, createV2Game(yearTwo, 2), 'creative_writing'),
    ).toThrow('Not a Year 3 elective event')
  })

  it('traces edges checked, Condition results, and the reached event', () => {
    const rich = {
      type: 'stat' as const,
      stat: 'money' as const,
      operator: 'gte' as const,
      value: 5000,
    }
    const content = game(
      [event('opening'), event('rich'), event('pass'), event('fail')],
      [
        eventNode('opening'),
        eventNode('rich'),
        {
          id: 'check',
          type: 'condition',
          join: 'or',
          conditions: [rich, { type: 'flag', flagId: 'never', value: true }],
          position: at,
        },
        eventNode('pass'),
        eventNode('fail'),
      ],
      [
        edge('opening', 'continue_story', 'rich', rich),
        edge('opening', 'continue_story', 'check'),
        edge('check', 'pass', 'pass'),
        edge('check', 'fail', 'fail'),
      ],
    )
    const trace: V2FlowStep[] = []
    chooseV2(content, createV2Game(content, 1), 'continue_story', trace)
    expect(trace).toEqual([
      {
        type: 'edge',
        from: 'opening',
        port: 'continue_story',
        to: 'check',
        edgeId: 'opening_continue_story_check',
        checked: [
          {
            edgeId: 'opening_continue_story_rich',
            condition: rich,
            passed: false,
          },
          {
            edgeId: 'opening_continue_story_check',
            condition: undefined,
            passed: true,
          },
        ],
      },
      {
        type: 'condition',
        nodeId: 'check',
        join: 'or',
        results: [
          { condition: rich, passed: false },
          {
            condition: { type: 'flag', flagId: 'never', value: true },
            passed: false,
          },
        ],
        passed: false,
      },
      {
        type: 'edge',
        from: 'check',
        port: 'fail',
        to: 'fail',
        edgeId: 'check_fail_fail',
        checked: [
          { edgeId: 'check_fail_fail', condition: undefined, passed: true },
        ],
      },
      { type: 'event', nodeId: 'fail', eventId: 'fail' },
    ])
  })

  it('traces Random candidates, period moves with review scores, and endings', () => {
    const content = reviewGame(
      { study: 50, stress: 20 },
      { year: 8, period: 'summer' },
    )
    const trace: V2FlowStep[] = []
    chooseV2(content, createV2Game(content, 1), 'continue_story', trace)
    expect(trace.slice(1)).toEqual([
      {
        type: 'nextPeriod',
        nodeId: 'next_period',
        from: { year: 8, period: 'summer' },
        to: { year: 8, period: 'summer' },
        review: 'dismiss',
        score: 48,
      },
      { type: 'ending', nodeId: null, endingId: 'dismissal' },
    ])

    const pooled = game(
      [event('opening'), { ...event('rain'), pool: 'daily' }],
      [
        eventNode('opening'),
        { id: 'daily', type: 'random', poolId: 'daily', position: at },
      ],
      [edge('opening', 'continue_story', 'daily')],
    )
    const randomTrace: V2FlowStep[] = []
    chooseV2(pooled, createV2Game(pooled, 1), 'continue_story', randomTrace)
    expect(randomTrace.at(-1)).toEqual({
      type: 'random',
      nodeId: 'daily',
      poolId: 'daily',
      candidates: ['rain'],
      eventId: 'rain',
    })
  })
})
