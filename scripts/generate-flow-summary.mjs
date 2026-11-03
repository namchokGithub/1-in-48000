import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function conditionText(condition) {
  if (!condition) return null
  if (condition.type === 'flag') {
    return `หาก \`${condition.flagId}\` เป็น ${condition.value ? 'true' : 'false'}`
  }
  if (condition.type === 'stat') {
    const operator = {
      gte: '>=',
      gt: '>',
      lte: '<=',
      lt: '<',
      eq: '=',
    }[condition.operator]
    return `หาก \`${condition.stat}\` ${operator} ${condition.value}`
  }
  return 'หากเข้าเงื่อนไข'
}

function flagEffects(choice) {
  return choice.effects
    .filter((effect) => effect.type === 'setFlag')
    .map((effect) =>
      effect.value
        ? `ตั้ง \`${effect.flagId}\``
        : `ตั้ง \`${effect.flagId}\` เป็น false`,
    )
}

function labelForNode(node, eventsById, events) {
  if (node.type === 'event')
    return eventsById.get(node.eventId)?.title ?? node.eventId
  if (node.type === 'random') {
    const candidates = events
      .filter((event) => event.pool === node.poolId)
      .map((event) => event.title)
    const suffix = candidates.length ? `: ${candidates.join(', ')}` : ''
    return `สุ่มจาก pool \`${node.poolId}\`${suffix}`
  }
  if (node.type === 'nextPeriod') return 'Next Period'
  if (node.type === 'condition') return 'ตรวจเงื่อนไข'
  if (node.type === 'ending') return `ฉากจบ \`${node.endingId}\``
  return node.type
}

function treePrefix(prefix, isLast) {
  return `${prefix}${isLast ? '└─' : '├─'}`
}

export function renderFlowSummary({ events, flow }) {
  const eventsById = new Map(events.map((event) => [event.id, event]))
  const nodesById = new Map(flow.nodes.map((node) => [node.id, node]))
  const edgesFrom = new Map()
  for (const edge of flow.edges) {
    const edges = edgesFrom.get(edge.from) ?? []
    edges.push(edge)
    edgesFrom.set(edge.from, edges)
  }

  const start = flow.nodes.find((node) => node.type === 'start')
  if (!start) throw new Error('Flow has no Start node')
  const startEdge = edgesFrom.get(start.id)?.[0]
  if (!startEdge) throw new Error('Start node has no outgoing edge')

  const lines = []
  const expanded = new Set()
  const renderTarget = (nodeId, prefix, isLast, label, ancestry) => {
    const node = nodesById.get(nodeId)
    if (!node) throw new Error(`Unknown node: ${nodeId}`)
    const nodeLabel = labelForNode(node, eventsById, events)
    if (ancestry.has(nodeId)) {
      lines.push(`${treePrefix(prefix, isLast)} ${label} -> ${nodeLabel}`)
      lines.push(
        `${prefix}${isLast ? '   ' : '│  '}└─ วนกลับไปที่ ${nodeLabel}`,
      )
      return
    }
    if (expanded.has(nodeId)) {
      lines.push(
        `${treePrefix(prefix, isLast)} ${label} -> ${nodeLabel} (ดูเส้นทางก่อนหน้า)`,
      )
      return
    }
    lines.push(`${treePrefix(prefix, isLast)} ${label} -> ${nodeLabel}`)
    expanded.add(nodeId)
    renderChildren(
      node,
      `${prefix}${isLast ? '   ' : '│  '}`,
      new Set([...ancestry, nodeId]),
    )
  }

  const renderChildren = (node, prefix, ancestry) => {
    const edges = edgesFrom.get(node.id) ?? []
    if (node.type === 'event') {
      const event = eventsById.get(node.eventId)
      if (!event) throw new Error(`Unknown event: ${node.eventId}`)
      if (!event.choices.length) {
        renderChildren({ ...node, type: 'nextPeriod' }, prefix, ancestry)
        return
      }
      const branches = event.choices.map((choice) => ({
        choice,
        edges: edges.filter(
          (edge) => edge.port === (event.selection ? 'next' : choice.id),
        ),
      }))
      branches.forEach(({ choice, edges: choiceEdges }, index) => {
        const isLastChoice = index === branches.length - 1
        lines.push(`${treePrefix(prefix, isLastChoice)} ${choice.text}`)
        const choicePrefix = `${prefix}${isLastChoice ? '   ' : '│  '}`
        const effects = flagEffects(choice)
        const paths = choiceEdges.map((edge, edgeIndex) => ({
          edge,
          label:
            (conditionText(edge.condition) ?? effects.join(', ')) || 'ไปต่อ',
          isLast: edgeIndex === choiceEdges.length - 1,
        }))
        paths.forEach(({ edge, label, isLast }) =>
          renderTarget(edge.to, choicePrefix, isLast, label, ancestry),
        )
      })
      return
    }

    const portGroups = [
      ...new Map(edges.map((edge) => [edge.port, null])).keys(),
    ]
    portGroups.forEach((port, index) => {
      const portEdges = edges.filter((edge) => edge.port === port)
      portEdges.forEach((edge, edgeIndex) => {
        const isLast =
          index === portGroups.length - 1 && edgeIndex === portEdges.length - 1
        renderTarget(
          edge.to,
          prefix,
          isLast,
          conditionText(edge.condition) ?? port,
          ancestry,
        )
      })
    })
  }

  const first = nodesById.get(startEdge.to)
  if (!first) throw new Error(`Unknown node: ${startEdge.to}`)
  lines.push(labelForNode(first, eventsById, events))
  expanded.add(first.id)
  renderChildren(first, '', new Set([first.id]))
  return lines.join('\n')
}

export function outputPathFromArgs(args) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const defaultPath = `docs/flows/FLOW_${now.getFullYear()}${pad(
    now.getMonth() + 1,
  )}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}${pad(now.getSeconds())}.md`
  return (
    args.find((argument) => argument !== '--') ?? defaultPath
  )
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const outputPath = resolve(root, outputPathFromArgs(process.argv.slice(2)))
  const [eventsText, flowText] = await Promise.all([
    readFile(resolve(root, 'public/content-v2/events.json'), 'utf8'),
    readFile(resolve(root, 'public/content-v2/flow.json'), 'utf8'),
  ])
  const summary = renderFlowSummary({
    events: JSON.parse(eventsText),
    flow: JSON.parse(flowText),
  })
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `# Flow\n\n\`\`\`text\n${summary}\n\`\`\`\n`)
  console.log(`Generated ${outputPath}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
