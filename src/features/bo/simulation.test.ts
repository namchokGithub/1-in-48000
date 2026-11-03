import { describe, expect, it } from 'vitest'
import { names, sample } from '../../content/v2/testSample'
import sampleFlow from '../../content/v2/sample-flow.json'
import { v2ContentSchema, type V2Content } from '../../content/v2/schema'
import { moveFlowNodes } from './flowEditing'
import {
  decideSimulation,
  describeDecision,
  rewindSimulation,
  simulationOutdated,
  simulationPath,
  simulationSave,
  startSimulation,
  type Simulation,
} from './simulation'

const content = v2ContentSchema.parse({ ...sample, names, flow: sampleFlow })

function start(eventId = 'student_loan', seed?: number): Simulation {
  const simulation = startSimulation(content, eventId, seed)
  if (typeof simulation === 'string') throw new Error(simulation)
  return simulation
}

describe('BO simulation', () => {
  it('plays decisions with the shared engine and highlights the path taken', () => {
    const simulation = start()
    expect(simulationSave(simulation).currentEventId).toBe('student_loan')
    expect(simulationPath(simulation)).toEqual({
      nodeIds: ['n_student_loan'],
      edgeIds: [],
    })

    const next = decideSimulation(simulation, {
      type: 'choice',
      choiceId: 'apply_kro',
    })
    expect(next.history).toHaveLength(1)
    expect(next.history[0]).toMatchObject({
      eventId: 'student_loan',
      decision: { type: 'choice', choiceId: 'apply_kro' },
    })
    expect(simulationPath(next).edgeIds).toContain('e_kro')
    expect(simulation.history).toHaveLength(0)
  })

  it('rewinds to a decision and plays another answer from the same state', () => {
    const first = decideSimulation(start(), {
      type: 'choice',
      choiceId: 'apply_kro',
    })
    const rewound = rewindSimulation(first, 0)
    expect(rewound.history).toEqual([])
    expect(simulationSave(rewound)).toBe(rewound.start)

    const other = decideSimulation(rewound, {
      type: 'choice',
      choiceId: 'apply_kyos',
    })
    expect(simulationPath(other).edgeIds).toContain('e_kyos')
    expect(simulationPath(other).edgeIds).not.toContain('e_kro')

    const again = decideSimulation(rewindSimulation(other, 0), {
      type: 'choice',
      choiceId: 'apply_kro',
    })
    expect(again.history).toEqual(first.history)
  })

  it('starts from the seed it is given', () => {
    expect(start().start.rngSeed).toBe(1)
    expect(start('student_loan', 77).start.rngSeed).toBe(77)
    expect(start('student_loan', 77).start).toEqual(
      start('student_loan', 77).start,
    )
  })

  it('keeps the history and reports an error when a decision fails', () => {
    const simulation = start()
    const failed = decideSimulation(simulation, {
      type: 'choice',
      choiceId: 'missing_choice',
    })
    expect(failed.history).toHaveLength(0)
    expect(failed.error).toBeTruthy()
    expect(
      decideSimulation(failed, { type: 'choice', choiceId: 'apply_kyos' })
        .error,
    ).toBeNull()
  })

  it('returns a message instead of a simulation for an unknown event', () => {
    expect(typeof startSimulation(content, 'missing_event')).toBe('string')
  })

  it('describes each kind of decision', () => {
    const event = 'borrow_from_friend'
    expect(
      describeDecision(content, {
        eventId: event,
        decision: {
          type: 'choices',
          choiceIds: ['accept_loan', 'ask_for_advice'],
        },
      }),
    ).toBe(
      ['accept_loan', 'ask_for_advice']
        .map(
          (id) =>
            content.events
              .find((item) => item.id === event)!
              .choices.find((choice) => choice.id === id)!.text,
        )
        .join(', '),
    )
    const major = content.majors[0]
    const faculty = content.faculties.find(
      (item) => item.id === major.facultyId,
    )!
    expect(
      describeDecision(content, {
        eventId: 'choose_program',
        decision: {
          type: 'program',
          facultyId: faculty.id,
          majorId: major.id,
        },
      }),
    ).toBe(`${faculty.name} · ${major.name}`)
    expect(
      describeDecision(content, {
        eventId: 'free_elective',
        decision: { type: 'elective', electiveId: content.electives[0].id },
      }),
    ).toBe(content.electives[0].name)
  })

  it('notices draft edits the engine reads but not card moves', () => {
    const simulation = start()
    expect(simulationOutdated(simulation, content)).toBe(false)
    const moved: V2Content = {
      ...content,
      flow: moveFlowNodes(content.flow, { review: { x: 999, y: 999 } }),
    }
    expect(simulationOutdated(simulation, moved)).toBe(false)
    expect(
      simulationOutdated(simulation, {
        ...content,
        flow: {
          ...content.flow,
          edges: content.flow.edges.filter((edge) => edge.id !== 'e_kro'),
        },
      }),
    ).toBe(true)
    expect(
      simulationOutdated(simulation, {
        ...content,
        events: content.events.map((event) =>
          event.id === 'student_loan' ? { ...event, title: 'ใหม่' } : event,
        ),
      }),
    ).toBe(true)
  })
})
