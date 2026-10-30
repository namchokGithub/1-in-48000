import type { V2Content } from '../../content/v2/schema'
import type { IssueTarget } from './issueTarget'

type Condition = V2Content['events'][number]['conditions'][number]
type Effect = V2Content['events'][number]['choices'][number]['effects'][number]

export type FlagUsage = {
  id: string
  sets: IssueTarget[]
  checks: IssueTarget[]
}

function setFlags(effects: Effect[]): string[] {
  return effects.flatMap((effect) => {
    if (effect.type === 'setFlag') return [effect.flagId]
    if (effect.type === 'schedule') return setFlags([effect.effect])
    if (effect.type === 'chance')
      return setFlags([...effect.successEffects, ...effect.failureEffects])
    return []
  })
}

function checkedFlags(conditions: Condition[]): string[] {
  return conditions.flatMap((condition) =>
    condition.type === 'flag' ? [condition.flagId] : [],
  )
}

// Where each flag is set and checked, for the BO flag tab. A place appears
// once per flag even when it sets or checks the flag more than once.
export function flagUsage(
  content: Pick<V2Content, 'events' | 'electives' | 'flow'>,
): FlagUsage[] {
  const usage = new Map<string, FlagUsage>()
  const add = (kind: 'sets' | 'checks', ids: string[], place: IssueTarget) => {
    for (const id of new Set(ids)) {
      const entry = usage.get(id) ?? { id, sets: [], checks: [] }
      entry[kind].push(place)
      usage.set(id, entry)
    }
  }

  content.events.forEach((event, index) => {
    const base = {
      section: 'events' as const,
      index,
      id: event.id,
      label: `เหตุการณ์ “${event.title}” (${event.id})`,
    }
    add('checks', checkedFlags(event.conditions), {
      ...base,
      field: 'เงื่อนไขเหตุการณ์',
    })
    event.choices.forEach((choice) => {
      add('checks', checkedFlags(choice.conditions), {
        ...base,
        field: `เงื่อนไขตัวเลือก “${choice.text}”`,
      })
      add('sets', setFlags(choice.effects), {
        ...base,
        field: `ตัวเลือก “${choice.text}”`,
      })
    })
  })
  content.electives.forEach((elective, index) =>
    add('sets', setFlags(elective.effects), {
      section: 'electives',
      index,
      id: elective.id,
      label: `วิชาเสรี “${elective.name}” (${elective.id})`,
      field: 'ผลของวิชา',
    }),
  )
  for (const node of content.flow.nodes)
    if (node.type === 'condition')
      add('checks', checkedFlags(node.conditions), {
        section: 'flow',
        label: 'Flow เรื่อง',
        field: `การ์ด Condition ${node.id}`,
      })
  for (const edge of content.flow.edges)
    if (edge.condition)
      add('checks', checkedFlags([edge.condition]), {
        section: 'flow',
        label: 'Flow เรื่อง',
        field: `เส้น ${edge.from} → ${edge.to}`,
      })

  return [...usage.values()].sort((a, b) => a.id.localeCompare(b.id))
}
