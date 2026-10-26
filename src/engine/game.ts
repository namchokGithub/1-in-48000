import type {
  Ending,
  Event,
  GameConfig,
  GameTime,
  StateEffect,
  Stats,
} from '../content/schema'
import type { PlayerSave } from '../save/schema'
import { matchesAllConditions } from './conditions'
import { rollIndex } from './rng'
import { compareTime, nextTime } from './time'

export type GameContent = {
  config: GameConfig
  events: Event[]
  endings: Ending[]
}

type Choice = Event['choices'][number]

function findEvent(content: GameContent, id: string): Event {
  const event = content.events.find((candidate) => candidate.id === id)
  if (!event) throw new Error(`Unknown event: ${id}`)
  return event
}

export function createGame(
  content: GameContent,
  playerName: string,
  rngSeed: number,
  backgroundId: string = content.config.backgrounds[0].id,
): PlayerSave {
  const name = playerName.trim()
  if (!name) throw new Error('Player name is required')
  if (!Number.isInteger(rngSeed) || rngSeed < 0 || rngSeed > 4_294_967_295) {
    throw new Error('RNG seed must be a uint32 integer')
  }
  const start = findEvent(content, content.config.startingEventId)
  const background = content.config.backgrounds.find(
    (candidate) => candidate.id === backgroundId,
  )
  if (!background) throw new Error(`Unknown background: ${backgroundId}`)
  if (compareTime(start.time, content.config.startingTime) !== 0) {
    throw new Error('Starting event time does not match config')
  }

  const save: PlayerSave = {
    saveVersion: 2,
    contentVersion: content.config.contentVersion,
    playerName: name,
    backgroundId,
    currentTime: { ...content.config.startingTime },
    currentEventId: start.id,
    endingId: null,
    stats: {
      study: Math.max(
        0,
        Math.min(
          100,
          content.config.initialStats.study + background.statDeltas.study,
        ),
      ),
      money: Math.max(
        0,
        content.config.initialStats.money + background.statDeltas.money,
      ),
      health: Math.max(
        0,
        Math.min(
          100,
          content.config.initialStats.health + background.statDeltas.health,
        ),
      ),
      stress: Math.max(
        0,
        Math.min(
          100,
          content.config.initialStats.stress + background.statDeltas.stress,
        ),
      ),
      relationships: Math.max(
        0,
        Math.min(
          100,
          content.config.initialStats.relationships +
            background.statDeltas.relationships,
        ),
      ),
    },
    flags: {},
    history: [],
    pendingEffects: [],
    rngSeed,
    rngState: rngSeed,
  }
  if (!matchesAllConditions(start.conditions, save)) {
    throw new Error('Starting event conditions do not hold')
  }
  return save
}

export function getCurrentEvent(
  content: GameContent,
  save: PlayerSave,
): Event | null {
  return save.currentEventId ? findEvent(content, save.currentEventId) : null
}

export function getAvailableChoices(event: Event, save: PlayerSave): Choice[] {
  return event.choices.filter((choice) =>
    matchesAllConditions(choice.conditions, save),
  )
}

function applyStateEffect(save: PlayerSave, effect: StateEffect): void {
  if (effect.type === 'setFlag') {
    save.flags[effect.flagId] = effect.value
    return
  }
  const stat = effect.stat
  const value = save.stats[stat] + effect.amount
  save.stats[stat] = Math.max(
    0,
    Math.min(stat === 'money' ? Infinity : 100, value),
  )
}

function applyPending(
  save: PlayerSave,
  predicate: (pending: PlayerSave['pendingEffects'][number]) => boolean,
): void {
  const remaining: PlayerSave['pendingEffects'] = []
  for (const pending of save.pendingEffects) {
    if (predicate(pending)) applyStateEffect(save, pending.effect)
    else remaining.push(pending)
  }
  save.pendingEffects = remaining
}

function moveToTime(save: PlayerSave, target: GameTime): void {
  if (compareTime(target, save.currentTime) < 0) {
    throw new Error('Cannot move to a past period')
  }
  while (compareTime(save.currentTime, target) < 0) {
    const next = nextTime(save.currentTime)
    if (!next) throw new Error('Cannot move past graduation')
    save.currentTime = next
    applyPending(
      save,
      (pending) =>
        pending.trigger.type === 'atPeriod' &&
        compareTime(pending.trigger.time, next) === 0,
    )
  }
}

function pickAtCurrentTime(
  content: GameContent,
  save: PlayerSave,
): Event | null {
  const visited = new Set(save.history.map((entry) => entry.eventId))
  const eligible = content.events.filter(
    (event) =>
      compareTime(event.time, save.currentTime) === 0 &&
      !visited.has(event.id) &&
      matchesAllConditions(event.conditions, save),
  )
  for (const kind of ['main', 'holiday', 'conditional'] as const) {
    const found = eligible.find((event) => event.kind === kind)
    if (found) return found
  }

  const randomAlreadyPlayed = content.events.some(
    (event) =>
      event.kind === 'random' &&
      compareTime(event.time, save.currentTime) === 0 &&
      visited.has(event.id),
  )
  if (randomAlreadyPlayed) return null
  const randomEvents = eligible.filter((event) => event.kind === 'random')
  if (!randomEvents.length) return null
  const roll = rollIndex(save.rngState, randomEvents.length)
  save.rngState = roll.nextState
  return randomEvents[roll.index]
}

function resolveEnding(content: GameContent, save: PlayerSave): void {
  const ending = content.endings.find((candidate) =>
    matchesAllConditions(candidate.conditions, save),
  )
  if (!ending) throw new Error('No ending matches this run')
  save.currentEventId = null
  save.endingId = ending.id
}

function resolveEarlyEnding(content: GameContent, save: PlayerSave): boolean {
  const ending = content.endings.find(
    (candidate) =>
      candidate.conditions.some(
        (condition) => condition.type === 'flag' && condition.value === true,
      ) && matchesAllConditions(candidate.conditions, save),
  )
  if (!ending) return false
  save.currentEventId = null
  save.endingId = ending.id
  return true
}

function selectNext(content: GameContent, save: PlayerSave): void {
  while (true) {
    const event = pickAtCurrentTime(content, save)
    if (event) {
      save.currentEventId = event.id
      return
    }
    if (resolveEarlyEnding(content, save)) return
    const next = nextTime(save.currentTime)
    if (!next) {
      resolveEnding(content, save)
      return
    }
    moveToTime(save, next)
  }
}

export function choose(
  content: GameContent,
  previous: PlayerSave,
  choiceId: string,
): PlayerSave {
  if (previous.contentVersion !== content.config.contentVersion) {
    throw new Error('Content version mismatch')
  }
  if (previous.endingId || !previous.currentEventId) {
    throw new Error('The game has ended')
  }
  const event = findEvent(content, previous.currentEventId)
  const choice = getAvailableChoices(event, previous).find(
    (candidate) => candidate.id === choiceId,
  )
  if (!choice) throw new Error(`Unavailable choice: ${choiceId}`)

  const save: PlayerSave = {
    ...previous,
    currentTime: { ...previous.currentTime },
    stats: { ...previous.stats },
    flags: { ...previous.flags },
    history: [...previous.history, { eventId: event.id, choiceId }],
    pendingEffects: [...previous.pendingEffects],
  }
  let nextEventId: string | null = null
  for (const effect of choice.effects) {
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
        save.history.some((entry) => entry.eventId === trigger.eventId)
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
    } else {
      applyStateEffect(save, effect)
    }
  }
  applyPending(save, (pending) => {
    const trigger = pending.trigger
    return trigger.type === 'afterEvent' && trigger.eventId === event.id
  })

  if (nextEventId) {
    const next = findEvent(content, nextEventId)
    if (save.history.some((entry) => entry.eventId === next.id)) {
      throw new Error(`Event already visited: ${next.id}`)
    }
    moveToTime(save, next.time)
    if (!matchesAllConditions(next.conditions, save)) {
      throw new Error(`Event conditions do not hold: ${next.id}`)
    }
    save.currentEventId = next.id
  } else {
    selectNext(content, save)
  }
  return save
}

export type LifeSummary = {
  playerName: string
  title: string
  summary: string
  stats: Stats
  eventsVisited: number
  choicesMade: number
}

export function summarizeLife(
  content: GameContent,
  save: PlayerSave,
): LifeSummary {
  if (!save.endingId) throw new Error('No ending has been reached')
  const ending = content.endings.find(
    (candidate) => candidate.id === save.endingId,
  )
  if (!ending) throw new Error(`Unknown ending: ${save.endingId}`)
  return {
    playerName: save.playerName,
    title: ending.title,
    summary: ending.summary,
    stats: { ...save.stats },
    eventsVisited: new Set(save.history.map((entry) => entry.eventId)).size,
    choicesMade: save.history.length,
  }
}
