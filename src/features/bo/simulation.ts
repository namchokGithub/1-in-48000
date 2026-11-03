import type { V2Content } from '../../content/v2/schema'
import {
  chooseV2,
  chooseV2Elective,
  chooseV2Many,
  chooseV2Program,
  type V2FlowStep,
} from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import { previewErrorMessage, tracedPath, type PreviewPath } from './flowTrace'
import { createV2PreviewSession } from './preview'

export type SimulationDecision =
  | { type: 'choice'; choiceId: string }
  | { type: 'choices'; choiceIds: string[] }
  | { type: 'program'; facultyId: string; majorId: string }
  | { type: 'elective'; electiveId: string }

/** One resolved decision: what was chosen and where the engine went next. */
export type SimulationEntry = {
  eventId: string
  decision: SimulationDecision
  save: V2PlayerSave
  steps: V2FlowStep[]
}

/**
 * A BO play-through of the current draft. It runs on a sandbox copy of the
 * content and never touches the player save or the draft.
 */
export type Simulation = {
  /** The draft the simulation started from, to notice later edits. */
  source: V2Content
  /** Sandbox content the engine plays. */
  content: V2Content
  eventId: string
  seed: number
  placed: boolean
  startNodeId: string | null
  start: V2PlayerSave
  history: SimulationEntry[]
  error: string | null
}

export function startSimulation(
  content: V2Content,
  eventId: string,
  seed = 1,
): Simulation | string {
  try {
    const session = createV2PreviewSession(content, eventId, seed)
    return {
      source: content,
      content: session.content,
      eventId,
      seed,
      placed: session.placed,
      startNodeId: session.startNodeId,
      start: session.save,
      history: [],
      error: null,
    }
  } catch (cause) {
    return cause instanceof Error ? cause.message : 'เริ่มทดลองไม่ได้'
  }
}

export function simulationSave(simulation: Simulation): V2PlayerSave {
  return simulation.history.at(-1)?.save ?? simulation.start
}

/** Resolves a decision with the shared engine and records it. */
export function decideSimulation(
  simulation: Simulation,
  decision: SimulationDecision,
): Simulation {
  const { content } = simulation
  const save = simulationSave(simulation)
  const steps: V2FlowStep[] = []
  try {
    const next =
      decision.type === 'choice'
        ? chooseV2(content, save, decision.choiceId, steps)
        : decision.type === 'choices'
          ? chooseV2Many(content, save, decision.choiceIds, steps)
          : decision.type === 'program'
            ? chooseV2Program(
                content,
                save,
                decision.facultyId,
                decision.majorId,
                steps,
              )
            : chooseV2Elective(content, save, decision.electiveId, steps)
    return {
      ...simulation,
      history: [
        ...simulation.history,
        { eventId: save.currentEventId ?? '', decision, save: next, steps },
      ],
      error: null,
    }
  } catch (cause) {
    return {
      ...simulation,
      error:
        cause instanceof Error
          ? previewErrorMessage(cause.message, content)
          : 'ทดลองตัวเลือกไม่ได้',
    }
  }
}

/** Goes back to just before decision `index`, so it can be chosen again. */
export function rewindSimulation(
  simulation: Simulation,
  index: number,
): Simulation {
  return {
    ...simulation,
    history: simulation.history.slice(0, Math.max(0, index)),
    error: null,
  }
}

export function simulationPath(simulation: Simulation): PreviewPath {
  return tracedPath(
    simulation.history.flatMap((entry) => entry.steps),
    simulation.startNodeId,
  )
}

export function describeDecision(
  content: Pick<V2Content, 'events' | 'faculties' | 'majors' | 'electives'>,
  entry: Pick<SimulationEntry, 'eventId' | 'decision'>,
): string {
  const { decision } = entry
  const event = content.events.find((item) => item.id === entry.eventId)
  const choice = (id: string) =>
    event?.choices.find((item) => item.id === id)?.text ?? id
  switch (decision.type) {
    case 'choice':
      return choice(decision.choiceId)
    case 'choices':
      return decision.choiceIds.map(choice).join(', ')
    case 'program':
      return [
        content.faculties.find((item) => item.id === decision.facultyId)
          ?.name ?? decision.facultyId,
        content.majors.find((item) => item.id === decision.majorId)?.name ??
          decision.majorId,
      ].join(' · ')
    case 'elective':
      return (
        content.electives.find((item) => item.id === decision.electiveId)
          ?.name ?? decision.electiveId
      )
  }
}

/**
 * True when the draft changed in a way the engine reads since the
 * simulation started. Moving, resizing, or recoloring cards does not count.
 */
export function simulationOutdated(
  simulation: Simulation,
  draft: V2Content,
): boolean {
  const { source } = simulation
  if (source === draft) return false
  const keys = Object.keys(draft) as (keyof V2Content)[]
  if (keys.some((key) => key !== 'flow' && draft[key] !== source[key]))
    return true
  if (draft.flow.edges.length !== source.flow.edges.length) return true
  const plain = (flow: V2Content['flow']) =>
    JSON.stringify({
      nodes: flow.nodes.flatMap((node) => {
        if (node.type === 'group') return []
        const { position: _position, parentId: _parentId, ...rest } = node
        void _position
        void _parentId
        return [rest]
      }),
      edges: flow.edges.map((edge) => {
        const { route: _route, ...rest } = edge
        void _route
        return rest
      }),
    })
  return plain(draft.flow) !== plain(source.flow)
}
