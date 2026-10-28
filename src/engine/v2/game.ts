import type {
  V2Content,
  V2Event,
  V2Stats,
  v2ConditionSchema,
  v2StateEffectSchema,
  v2TimeSchema,
} from '../../content/v2/schema'
import { v2PlayerSaveSchema, type V2PlayerSave } from '../../save/v2/schema'
import { rollIndex } from '../rng'
import { compareTime } from '../time'
import type { z } from 'zod'

type V2Time = z.infer<typeof v2TimeSchema>
type V2Condition = z.infer<typeof v2ConditionSchema>
type V2StateEffect = z.infer<typeof v2StateEffectSchema>
type V2Choice = V2Event['choices'][number]

export type V2GameContent = Pick<
  V2Content,
  | 'config'
  | 'events'
  | 'endings'
  | 'names'
  | 'faculties'
  | 'majors'
  | 'electives'
>

export function pickV2StartOption<T>(options: readonly T[], roll: number): T {
  if (!options.length) throw new Error('No starting options')
  if (!Number.isInteger(roll) || roll < 0 || roll > 4_294_967_295) {
    throw new Error('Starting option roll must be a uint32 integer')
  }
  return options[roll % options.length]
}

function findEvent(content: V2GameContent, id: string): V2Event {
  const event = content.events.find((candidate) => candidate.id === id)
  if (!event) throw new Error(`Unknown event: ${id}`)
  if (event.active === false) throw new Error(`Inactive event: ${id}`)
  return event
}

function bounded(stat: keyof V2Stats, value: number): number {
  return stat === 'money' || stat === 'debt' ? value : Math.min(100, value)
}

function compare(
  actual: number,
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte',
  expected: number,
): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected
    case 'gt':
      return actual > expected
    case 'gte':
      return actual >= expected
    case 'lt':
      return actual < expected
    case 'lte':
      return actual <= expected
  }
}

function matches(conditions: V2Condition[], save: V2PlayerSave): boolean {
  return conditions.every((condition) => {
    switch (condition.type) {
      case 'year':
        return compare(
          save.currentTime.year,
          condition.operator,
          condition.value,
        )
      case 'stat':
        return compare(
          save.stats[condition.stat],
          condition.operator,
          condition.value,
        )
      case 'flag':
        return (save.flags[condition.flagId] ?? false) === condition.value
      case 'pastEvent':
        return (
          save.history.some((entry) => entry.eventId === condition.eventId) ===
          condition.visited
        )
      case 'faculty':
        return save.facultyId === condition.facultyId
      case 'major':
        return save.majorId === condition.majorId
      case 'elective':
        return save.electiveId === condition.electiveId
    }
  })
}

export function createV2Game(
  content: V2GameContent,
  rngSeed: number,
  backgroundId = content.config.backgrounds[0].id,
): V2PlayerSave {
  if (!Number.isInteger(rngSeed) || rngSeed < 0 || rngSeed > 4_294_967_295) {
    throw new Error('RNG seed must be a uint32 integer')
  }
  const background = content.config.backgrounds.find(
    (item) => item.id === backgroundId,
  )
  if (!background) throw new Error(`Unknown background: ${backgroundId}`)
  const start = findEvent(content, content.config.startingEventId)
  if (compareTime(start.time, content.config.startingTime) !== 0) {
    throw new Error('Starting event time does not match config')
  }
  const stats = {} as V2Stats
  for (const stat of Object.keys(
    content.config.initialStats,
  ) as (keyof V2Stats)[]) {
    stats[stat] = bounded(
      stat,
      content.config.initialStats[stat] + background.statDeltas[stat],
    )
  }
  const nameRoll = rollIndex(rngSeed, content.names.length)
  const name = content.names[nameRoll.index]
  const save = v2PlayerSaveSchema.parse({
    saveVersion: 1,
    contentVersion: content.config.contentVersion,
    nameId: name.id,
    playerName: name.name,
    backgroundId,
    facultyId: null,
    majorId: null,
    electiveId: null,
    currentTime: { ...content.config.startingTime },
    currentEventId: start.id,
    endingId: null,
    stats,
    flags: {},
    history: [],
    pendingEffects: [],
    rngSeed,
    rngState: nameRoll.nextState,
  })
  if (!matches(start.conditions, save)) {
    throw new Error('Starting event conditions do not hold')
  }
  return save
}

export function getV2CurrentEvent(
  content: V2GameContent,
  save: V2PlayerSave,
): V2Event | null {
  return save.currentEventId ? findEvent(content, save.currentEventId) : null
}

export function getV2AvailableChoices(
  event: V2Event,
  save: V2PlayerSave,
): V2Choice[] {
  return event.choices.filter((choice) => matches(choice.conditions, save))
}

export function getV2EffectiveChancePercent(
  successPercent: number,
  lucky: number,
): number {
  return Math.max(0, Math.min(100, successPercent + lucky / 10))
}

function applyStateEffect(save: V2PlayerSave, effect: V2StateEffect): void {
  if (effect.type === 'setFlag') {
    save.flags[effect.flagId] = effect.value
  } else {
    save.stats[effect.stat] = bounded(
      effect.stat,
      save.stats[effect.stat] + effect.amount,
    )
  }
}

function applyPending(
  save: V2PlayerSave,
  predicate: (pending: V2PlayerSave['pendingEffects'][number]) => boolean,
): void {
  const remaining: V2PlayerSave['pendingEffects'] = []
  for (const pending of save.pendingEffects) {
    if (predicate(pending)) applyStateEffect(save, pending.effect)
    else remaining.push(pending)
  }
  save.pendingEffects = remaining
}

const periods = ['term1', 'break', 'term2', 'summer'] as const

function nextTime(time: V2Time): V2Time | null {
  const nextPeriod = periods[periods.indexOf(time.period) + 1]
  if (nextPeriod) return { year: time.year, period: nextPeriod }
  return time.year === 8 ? null : { year: time.year + 1, period: 'term1' }
}

function resolveEnding(
  content: V2GameContent,
  save: V2PlayerSave,
  id?: string,
): void {
  const ending = id
    ? content.endings.find((item) => item.id === id)
    : content.endings.find(
        (item) => item.id !== 'dismissal' && matches(item.conditions, save),
      )
  if (!ending)
    throw new Error(id ? `Unknown ending: ${id}` : 'No ending matches this run')
  save.currentEventId = null
  save.endingId = ending.id
}

function reviewStudy(content: V2GameContent, save: V2PlayerSave): boolean {
  const programYears =
    content.majors.find((major) => major.id === save.majorId)?.programYears ?? 4
  if (
    save.currentTime.period !== 'summer' ||
    (save.currentTime.year !== programYears &&
      save.currentTime.year !== 6 &&
      save.currentTime.year !== 8)
  ) {
    return false
  }
  if (save.currentTime.year === 4 && programYears === 6) return false
  const score = save.stats.study - Math.max(save.stats.stress, 0) / 10
  if (score >= 60) {
    resolveEnding(content, save)
    return true
  }
  if (save.currentTime.year === 8) {
    resolveEnding(content, save, 'dismissal')
    return true
  }
  return false
}

function moveToTime(
  content: V2GameContent,
  save: V2PlayerSave,
  target: V2Time,
): boolean {
  if (compareTime(target, save.currentTime) < 0) {
    throw new Error('Cannot move to a past period')
  }
  while (compareTime(save.currentTime, target) < 0) {
    if (reviewStudy(content, save)) return false
    const next = nextTime(save.currentTime)
    if (!next) throw new Error('Cannot move past year 8')
    save.currentTime = next
    applyPending(
      save,
      (pending) =>
        pending.trigger.type === 'atPeriod' &&
        compareTime(pending.trigger.time, next) === 0,
    )
  }
  return true
}

function pickAtCurrentTime(
  content: V2GameContent,
  save: V2PlayerSave,
): V2Event | null {
  const visited = new Set(save.history.map((entry) => entry.eventId))
  const eligible = content.events.filter(
    (event) =>
      event.active !== false &&
      compareTime(event.time, save.currentTime) === 0 &&
      !visited.has(event.id) &&
      matches(event.conditions, save),
  )
  for (const kind of ['main', 'holiday', 'conditional'] as const) {
    const found = eligible.find((event) => event.kind === kind)
    if (found) return found
  }
  const randomPlayed = content.events.some(
    (event) =>
      event.kind === 'random' &&
      compareTime(event.time, save.currentTime) === 0 &&
      visited.has(event.id),
  )
  if (randomPlayed) return null
  const random = eligible.filter((event) => event.kind === 'random')
  if (!random.length) return null
  const roll = rollIndex(save.rngState, random.length)
  save.rngState = roll.nextState
  return random[roll.index]
}

function selectNext(content: V2GameContent, save: V2PlayerSave): void {
  while (true) {
    const event = pickAtCurrentTime(content, save)
    if (event) {
      save.currentEventId = event.id
      return
    }
    const early = content.endings.find(
      (ending) =>
        ending.id !== 'dismissal' &&
        ending.conditions.some(
          (condition) => condition.type === 'flag' && condition.value === true,
        ) &&
        matches(ending.conditions, save),
    )
    if (early) {
      resolveEnding(content, save, early.id)
      return
    }
    if (reviewStudy(content, save)) return
    const next = nextTime(save.currentTime)
    if (!next) throw new Error('No ending after year 8')
    moveToTime(content, save, next)
  }
}

function resolveChoices(
  content: V2GameContent,
  previous: V2PlayerSave,
  choices: V2Choice[],
  eventLink?: string,
): V2PlayerSave {
  if (previous.contentVersion !== content.config.contentVersion) {
    throw new Error('Content version mismatch')
  }
  if (previous.endingId || !previous.currentEventId)
    throw new Error('The game has ended')
  const event = findEvent(content, previous.currentEventId)
  if (!choices.length) throw new Error('No choices selected')
  const entry: V2PlayerSave['history'][number] = {
    eventId: event.id,
    choiceIds: choices.map((choice) => choice.id),
    time: { ...previous.currentTime },
    chanceOutcomes: [],
  }
  const save: V2PlayerSave = {
    ...previous,
    currentTime: { ...previous.currentTime },
    stats: { ...previous.stats },
    flags: { ...previous.flags },
    history: [...previous.history, entry],
    pendingEffects: [...previous.pendingEffects],
  }
  let nextEventId: string | null = eventLink ?? null
  choices
    .flatMap((choice) => choice.effects)
    .forEach((effect, effectIndex) => {
      if (effect.type === 'schedule') {
        const trigger = effect.trigger
        if (
          trigger.type === 'atPeriod' &&
          compareTime(trigger.time, save.currentTime) <= 0
        ) {
          throw new Error('Scheduled period must be in the future')
        }
        if (
          trigger.type === 'afterEvent' &&
          trigger.eventId !== event.id &&
          save.history.some((item) => item.eventId === trigger.eventId)
        ) {
          throw new Error('Scheduled event was already visited')
        }
        save.pendingEffects.push({
          sourceEventId: event.id,
          trigger,
          effect: effect.effect,
        })
      } else if (effect.type === 'goToEvent') {
        nextEventId = effect.eventId
      } else if (effect.type === 'chance') {
        const effectivePercent = getV2EffectiveChancePercent(
          effect.successPercent,
          save.stats.lucky,
        )
        const roll = rollIndex(save.rngState, 4_294_967_296)
        save.rngState = roll.nextState
        const succeeded = roll.index < (effectivePercent / 100) * 4_294_967_296
        entry.chanceOutcomes.push({ effectIndex, succeeded, effectivePercent })
        for (const result of succeeded
          ? effect.successEffects
          : effect.failureEffects) {
          applyStateEffect(save, result)
        }
      } else {
        applyStateEffect(save, effect)
      }
    })
  applyPending(
    save,
    (pending) =>
      pending.trigger.type === 'afterEvent' &&
      pending.trigger.eventId === event.id,
  )
  if (nextEventId) {
    const next = findEvent(content, nextEventId)
    if (save.history.some((item) => item.eventId === next.id)) {
      throw new Error(`Event already visited: ${next.id}`)
    }
    if (!moveToTime(content, save, next.time)) return save
    if (!matches(next.conditions, save)) {
      throw new Error(`Event conditions do not hold: ${next.id}`)
    }
    save.currentEventId = next.id
  } else {
    selectNext(content, save)
  }
  return save
}

export function chooseV2(
  content: V2GameContent,
  previous: V2PlayerSave,
  choiceId: string,
): V2PlayerSave {
  const event = findEvent(content, previous.currentEventId ?? '')
  if (event.selection)
    throw new Error('This event requires its selection action')
  const choice = getV2AvailableChoices(event, previous).find(
    (item) => item.id === choiceId,
  )
  if (!choice) throw new Error(`Unavailable choice: ${choiceId}`)
  return resolveChoices(content, previous, [choice])
}

export function chooseV2Many(
  content: V2GameContent,
  previous: V2PlayerSave,
  choiceIds: string[],
): V2PlayerSave {
  const event = findEvent(content, previous.currentEventId ?? '')
  const selection = event.selection
  if (selection?.type !== 'multiple')
    throw new Error('Not a multi-select event')
  const ids = new Set(choiceIds)
  if (
    ids.size !== choiceIds.length ||
    ids.size < selection.min ||
    ids.size > selection.max
  ) {
    throw new Error('Selection count is outside the allowed range')
  }
  const available = getV2AvailableChoices(event, previous)
  const choices = available.filter((choice) => ids.has(choice.id))
  if (choices.length !== ids.size)
    throw new Error('Unavailable choice selected')
  return resolveChoices(content, previous, choices, selection.goToEventId)
}

export function chooseV2Program(
  content: V2GameContent,
  previous: V2PlayerSave,
  facultyId: string,
  majorId: string,
): V2PlayerSave {
  const event = findEvent(content, previous.currentEventId ?? '')
  if (event.selection?.type !== 'program')
    throw new Error('Not a program event')
  const faculty = content.faculties.find((item) => item.id === facultyId)
  const major = content.majors.find((item) => item.id === majorId)
  if (
    !faculty ||
    !major ||
    major.facultyId !== faculty.id ||
    (major.programYears === 6 && !faculty.supportsSixYear)
  ) {
    throw new Error('Invalid faculty and major selection')
  }
  const choice = getV2AvailableChoices(event, previous)[0]
  if (!choice) throw new Error('No program confirmation choice')
  const next = resolveChoices(content, { ...previous, facultyId, majorId }, [
    choice,
  ])
  const entry = next.history.at(-1)!
  entry.facultyId = facultyId
  entry.majorId = majorId
  return next
}

export function chooseV2Elective(
  content: V2GameContent,
  previous: V2PlayerSave,
  electiveId: string,
): V2PlayerSave {
  const event = findEvent(content, previous.currentEventId ?? '')
  if (event.selection?.type !== 'elective' || event.time.year !== 3) {
    throw new Error('Not a Year 3 elective event')
  }
  const elective = content.electives.find((item) => item.id === electiveId)
  if (!elective) throw new Error(`Unknown elective: ${electiveId}`)
  const choice = getV2AvailableChoices(event, previous)[0]
  if (!choice) throw new Error('No elective confirmation choice')
  const prepared: V2PlayerSave = {
    ...previous,
    electiveId,
    stats: { ...previous.stats },
    flags: { ...previous.flags },
  }
  for (const effect of elective.effects) applyStateEffect(prepared, effect)
  const next = resolveChoices(content, prepared, [choice])
  next.history.at(-1)!.electiveId = electiveId
  return next
}

export type V2LifeSummary = {
  playerName: string
  title: string
  summary: string
  stats: V2Stats
  eventsVisited: number
  choicesMade: number
  timeline: Array<{
    time: V2Time | null
    eventId: string
    eventTitle: string
    choiceIds: string[]
    choiceText: string
    chanceOutcomes: V2PlayerSave['history'][number]['chanceOutcomes']
  }>
}

export function summarizeV2Life(
  content: V2GameContent,
  save: V2PlayerSave,
): V2LifeSummary {
  if (!save.endingId) throw new Error('No ending has been reached')
  const ending = content.endings.find((item) => item.id === save.endingId)
  if (!ending) throw new Error(`Unknown ending: ${save.endingId}`)
  return {
    playerName: save.playerName,
    title: ending.title,
    summary: ending.summary,
    stats: { ...save.stats },
    eventsVisited: new Set(save.history.map((entry) => entry.eventId)).size,
    choicesMade: save.history.length,
    timeline: save.history.map((entry) => {
      const event = content.events.find((item) => item.id === entry.eventId)
      const choices = entry.choiceIds.map(
        (id) => event?.choices.find((item) => item.id === id)?.text ?? id,
      )
      const faculty = content.faculties.find(
        (item) => item.id === entry.facultyId,
      )
      const major = content.majors.find((item) => item.id === entry.majorId)
      const elective = content.electives.find(
        (item) => item.id === entry.electiveId,
      )
      const choiceText =
        faculty && major
          ? `${faculty.name} · ${major.name}`
          : (elective?.name ?? choices.join(', '))
      return {
        time: entry.time ? { ...entry.time } : null,
        eventId: entry.eventId,
        eventTitle: event?.title ?? entry.eventId,
        choiceIds: [...entry.choiceIds],
        choiceText,
        chanceOutcomes: entry.chanceOutcomes.map((outcome) => ({ ...outcome })),
      }
    }),
  }
}
