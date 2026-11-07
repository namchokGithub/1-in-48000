import type { V2Event, V2Stats } from '../../content/v2/schema'

export type ProofreadSort = 'time' | 'id' | 'file'

type Entry<T> = { event: T; index: number }

const periodOrder: Record<V2Event['time']['period'], number> = {
  term1: 0,
  break: 1,
  term2: 2,
  summer: 3,
}

/**
 * Events in proofreading order. Inactive events always come last, like the
 * event list; within each group the sort is by time (year, then period),
 * by ID, or by file order. Ties keep file order.
 */
export function proofreadEntries<
  T extends Pick<V2Event, 'id' | 'time' | 'active'>,
>(events: T[], sort: ProofreadSort): Entry<T>[] {
  const entries = events.map((event, index) => ({ event, index }))
  const compare = (a: Entry<T>, b: Entry<T>) => {
    if (sort === 'time') {
      const byTime =
        a.event.time.year - b.event.time.year ||
        periodOrder[a.event.time.period] - periodOrder[b.event.time.period]
      if (byTime) return byTime
    }
    if (sort === 'id') {
      const byId = a.event.id.localeCompare(b.event.id)
      if (byId) return byId
    }
    return a.index - b.index
  }
  const active = entries.filter(({ event }) => event.active !== false)
  const inactive = entries.filter(({ event }) => event.active === false)
  return [...active.sort(compare), ...inactive.sort(compare)]
}

/** The event index before or after `selected` in `entries`, or -1. */
export function neighborIndex(
  entries: { index: number }[],
  selected: number,
  direction: -1 | 1,
): number {
  const position = entries.findIndex(({ index }) => index === selected)
  if (position < 0) return entries[0]?.index ?? -1
  return entries[position + direction]?.index ?? -1
}

/** A stat change of a choice that proofreading can edit. */
export type EditableStatDelta = {
  effectIndex: number
  /** True for a `schedule` effect that changes the stat later. */
  delayed: boolean
  stat: keyof V2Stats
  amount: number
}

type Choice = V2Event['choices'][number]

/**
 * The stat changes proofreading edits: immediate `statDelta` effects and
 * scheduled ones. Chance and flag effects stay in the event form.
 */
export function editableStatDeltas(choice: Choice): EditableStatDelta[] {
  return choice.effects.flatMap((effect, effectIndex): EditableStatDelta[] => {
    if (effect.type === 'statDelta')
      return [
        {
          effectIndex,
          delayed: false,
          stat: effect.stat,
          amount: effect.amount,
        },
      ]
    if (effect.type === 'schedule' && effect.effect.type === 'statDelta')
      return [
        {
          effectIndex,
          delayed: true,
          stat: effect.effect.stat,
          amount: effect.effect.amount,
        },
      ]
    return []
  })
}

/** How many effects of a choice proofreading does not edit. */
export function otherEffectCount(choice: Choice): number {
  return choice.effects.length - editableStatDeltas(choice).length
}

/** Changes the stat or amount of one editable stat change of a choice. */
export function updateStatDelta(
  choice: Choice,
  effectIndex: number,
  change: { stat?: keyof V2Stats; amount?: number },
): Choice {
  return {
    ...choice,
    effects: choice.effects.map((effect, index) => {
      if (index !== effectIndex) return effect
      if (effect.type === 'statDelta') return { ...effect, ...change }
      if (effect.type === 'schedule' && effect.effect.type === 'statDelta')
        return { ...effect, effect: { ...effect.effect, ...change } }
      return effect
    }),
  }
}

export type SelectionMode = 'single' | 'multiple'

/**
 * Switches an event between picking one choice and picking several. Program
 * and elective events keep their selection, since the Flow board and the
 * game treat them differently.
 */
export function withSelectionMode(
  event: V2Event,
  mode: SelectionMode,
): V2Event {
  const current = event.selection?.type ?? 'single'
  if (current === 'program' || current === 'elective' || current === mode)
    return event
  if (mode === 'single') return { ...event, selection: undefined }
  return {
    ...event,
    selection: {
      type: 'multiple',
      min: 1,
      max: Math.max(1, Math.min(2, event.choices.length)),
    },
  }
}
