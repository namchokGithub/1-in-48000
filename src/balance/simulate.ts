import type { V2Content, V2Event, V2Stats } from '../content/v2/schema'
import {
  chooseV2,
  chooseV2Elective,
  chooseV2Many,
  chooseV2Program,
  createV2Game,
  getV2AvailableChoices,
  getV2CurrentEvent,
  getV2EffectiveChancePercent,
  getV2Grade,
  getV2ModifiedAmount,
} from '../engine/v2/game'
import type { V2PlayerSave } from '../save/v2/schema'

/**
 * How a simulated player picks: `random`, or favouring one kind of stat as
 * shown before the choice (the immediate and chance effects a player sees).
 */
export const POLICIES = [
  'random',
  'study',
  'money',
  'health',
  'social',
  'chill',
] as const
export type Policy = (typeof POLICIES)[number]

type Stat = keyof V2Stats
type Choice = V2Event['choices'][number]
type Effect = Choice['effects'][number]

const WEIGHTS: Record<
  Exclude<Policy, 'random'>,
  Partial<Record<Stat, number>>
> = {
  study: { study: 1 },
  money: { money: 0.01, debt: -0.01 },
  health: { health: 1, stress: -0.5 },
  social: { relationships: 1 },
  chill: { stress: -1, health: 0.5 },
}

export type RunResult = {
  seed: number
  policy: Policy
  backgroundId: string
  facultyId: string | null
  majorId: string | null
  programYears: number | null
  endingId: string | null
  /** Year when the run ended. */
  finalYear: number
  grade: number | null
  stats: V2Stats
  /** Money after the ending settles debt, as the life summary shows it. */
  finalMoney: number
  path: { eventId: string; choiceIds: string[] }[]
  /** Set when the run could not continue. */
  error?: string
}

/** Small seeded generator for the simulated player's own decisions. */
function decisionRandom(seed: number) {
  let state = (seed ^ 0x9e3779b9) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

/** Value of the effects a player sees before choosing, for one policy. */
export function scoreEffects(
  effects: Effect[],
  policy: Policy,
  lucky: number,
  amountOf: (stat: Stat, amount: number) => number = (_, amount) => amount,
): number {
  if (policy === 'random') return 0
  const weights = WEIGHTS[policy]
  let score = 0
  for (const effect of effects) {
    if (effect.type === 'statDelta')
      score +=
        (weights[effect.stat] ?? 0) * amountOf(effect.stat, effect.amount)
    else if (effect.type === 'chance') {
      const chance =
        getV2EffectiveChancePercent(effect.successPercent, lucky) / 100
      score +=
        chance * scoreEffects(effect.successEffects, policy, lucky, amountOf) +
        (1 - chance) *
          scoreEffects(effect.failureEffects, policy, lucky, amountOf)
    }
    // Delayed effects and flags are hidden from the player before choosing.
  }
  return score
}

/** Choices the engine accepts now: not scheduling for an event already seen. */
function playable(event: V2Event, save: V2PlayerSave): Choice[] {
  return getV2AvailableChoices(event, save).filter((choice) =>
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
}

function ranked<T>(
  items: T[],
  score: (item: T) => number,
  random: () => number,
): T[] {
  // Shuffle first so equal scores break ties at random.
  const shuffled = items
    .map((item) => ({ item, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item)
  return shuffled.sort((a, b) => score(b) - score(a))
}

export function simulateRun(
  content: V2Content,
  options: {
    seed: number
    policy: Policy
    majorId?: string
    backgroundId?: string
    maxSteps?: number
  },
): RunResult {
  const random = decisionRandom(options.seed)
  const backgrounds = content.config.backgrounds
  const backgroundId =
    options.backgroundId ??
    backgrounds[Math.floor(random() * backgrounds.length)].id
  const hidden = (event: V2Event) =>
    options.policy === 'random' || event.hideStatChanges === true
  let save = createV2Game(content, options.seed, backgroundId)
  let error: string | undefined
  for (
    let step = 0;
    step < (options.maxSteps ?? 2000) && !save.endingId;
    step += 1
  ) {
    const event = getV2CurrentEvent(content, save)
    if (!event) {
      error = 'No current event and no ending'
      break
    }
    const score = (effects: Effect[]) =>
      hidden(event)
        ? 0
        : scoreEffects(
            effects,
            options.policy,
            save.stats.lucky,
            (stat, amount) =>
              getV2ModifiedAmount(
                content.config.statModifiers,
                save.stats,
                stat,
                amount,
              ),
          )
    try {
      if (event.selection?.type === 'program') {
        const majors = content.majors.filter((major) =>
          content.faculties.some(
            (faculty) =>
              faculty.id === major.facultyId &&
              (major.programYears === 4 || faculty.supportsSixYear),
          ),
        )
        const major =
          majors.find((item) => item.id === options.majorId) ??
          majors[Math.floor(random() * majors.length)]
        save = chooseV2Program(content, save, major.facultyId, major.id)
      } else if (event.selection?.type === 'elective') {
        const elective = ranked(
          content.electives,
          (item) => score(item.effects),
          random,
        )[0]
        save = chooseV2Elective(content, save, elective.id)
      } else {
        const choices = playable(event, save)
        if (!choices.length) {
          error = `No playable choice in ${event.id}`
          break
        }
        const order = ranked(choices, (choice) => score(choice.effects), random)
        if (event.selection?.type === 'multiple') {
          const { min, max } = event.selection
          const most = Math.min(max, order.length)
          const count =
            options.policy === 'random'
              ? min + Math.floor(random() * (most - min + 1))
              : Math.max(
                  min,
                  order
                    .slice(0, most)
                    .filter((choice) => score(choice.effects) > 0).length,
                )
          save = chooseV2Many(
            content,
            save,
            order.slice(0, count).map((choice) => choice.id),
          )
        } else save = chooseV2(content, save, order[0].id)
      }
    } catch (caught) {
      error = `${event.id}: ${caught instanceof Error ? caught.message : String(caught)}`
      break
    }
  }
  if (!save.endingId && !error) error = 'Step limit reached'
  const major = content.majors.find((item) => item.id === save.majorId)
  return {
    seed: options.seed,
    policy: options.policy,
    backgroundId,
    facultyId: save.facultyId ?? null,
    majorId: save.majorId ?? null,
    programYears: major?.programYears ?? null,
    endingId: save.endingId,
    finalYear: save.currentTime.year,
    grade: save.endingId ? getV2Grade(save.stats.study, save.rngSeed) : null,
    stats: { ...save.stats },
    finalMoney: save.stats.money - save.stats.debt,
    path: save.history.map((entry) => ({
      eventId: entry.eventId,
      choiceIds: [...entry.choiceIds],
    })),
    error,
  }
}
