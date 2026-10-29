import type { V2Event, V2Flow, V2FlowIssue } from './schema.ts'

export type V2FlowReport = { errors: V2FlowIssue[]; warnings: V2FlowIssue[] }

export function validateV2Flow(flow: V2Flow, events: V2Event[]): V2FlowReport {
  const errors: V2FlowIssue[] = []
  const warnings: V2FlowIssue[] = []
  const eventsById = new Map(events.map((event) => [event.id, event]))
  const outgoing = new Map<string, V2Flow['edges']>()
  for (const edge of flow.edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge])
  }

  flow.nodes.forEach((node, index) => {
    const path = ['nodes', index]
    const edges = outgoing.get(node.id) ?? []
    const portEdges = (port: string) =>
      edges.filter((edge) => edge.port === port)
    const checkPort = (port: string, label: string) => {
      const found = portEdges(port)
      if (!found.length) {
        errors.push({ path, message: `${label} has no edge: ${node.id}` })
      } else if (found.every((edge) => edge.condition)) {
        warnings.push({
          path,
          message: `${label} may stop when no edge condition holds: ${node.id}`,
        })
      }
    }

    if (node.type === 'event') {
      const event = eventsById.get(node.eventId)
      if (!event) return
      if (event.selection) checkPort('next', 'Event')
      else
        event.choices.forEach((choice) =>
          checkPort(choice.id, `Choice ${choice.id}`),
        )
    } else if (node.type === 'nextPeriod') {
      if (!edges.length) {
        errors.push({ path, message: `Next Period has no edge: ${node.id}` })
        return
      }
      if (!portEdges('next').length)
        warnings.push({
          path,
          message: `Next Period has no next edge: ${node.id}`,
        })
      const review = ['graduate', 'extend'].filter(
        (port) => portEdges(port).length,
      )
      if (review.length === 1)
        warnings.push({
          path,
          message: `Next Period needs both graduate and extend edges: ${node.id}`,
        })
    } else if (node.type === 'condition') {
      checkPort('pass', 'Condition pass')
      checkPort('fail', 'Condition fail')
    } else if (node.type === 'random') {
      checkPort('after', 'Random after')
      checkPort('fallback', 'Random fallback')
    }
  })

  const reachable = new Set<string>()
  const queue = flow.nodes
    .filter((node) => node.type === 'start')
    .map((node) => node.id)
  while (queue.length) {
    const id = queue.pop()!
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const edge of outgoing.get(id) ?? []) queue.push(edge.to)
  }
  flow.nodes.forEach((node, index) => {
    if (!reachable.has(node.id))
      warnings.push({
        path: ['nodes', index],
        message: `Unreachable from Start: ${node.id}`,
      })
  })

  for (const loop of findLoops(flow)) {
    const members = new Set(loop)
    const timeMoves = flow.nodes.some(
      (node) => members.has(node.id) && node.type === 'nextPeriod',
    )
    if (timeMoves) continue
    const exits = flow.edges.filter(
      (edge) => members.has(edge.from) && !members.has(edge.to),
    )
    if (!exits.length || exits.every((edge) => edge.condition)) {
      warnings.push({
        path: ['nodes', flow.nodes.findIndex((node) => node.id === loop[0])],
        message: `Loop may never exit: ${loop.join(' → ')}`,
      })
    }
  }

  return { errors, warnings }
}

function findLoops(flow: V2Flow): string[][] {
  const next = new Map<string, string[]>()
  for (const edge of flow.edges) {
    next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to])
  }
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const loops: string[][] = []
  let counter = 0

  const visit = (id: string) => {
    index.set(id, counter)
    low.set(id, counter)
    counter += 1
    stack.push(id)
    onStack.add(id)
    for (const to of next.get(id) ?? []) {
      if (!index.has(to)) {
        visit(to)
        low.set(id, Math.min(low.get(id)!, low.get(to)!))
      } else if (onStack.has(to)) {
        low.set(id, Math.min(low.get(id)!, index.get(to)!))
      }
    }
    if (low.get(id) !== index.get(id)) return
    const component: string[] = []
    let member: string
    do {
      member = stack.pop()!
      onStack.delete(member)
      component.push(member)
    } while (member !== id)
    const selfLoop = (next.get(id) ?? []).includes(id)
    if (component.length > 1 || selfLoop) loops.push(component.reverse())
  }

  for (const node of flow.nodes) if (!index.has(node.id)) visit(node.id)
  return loops
}
