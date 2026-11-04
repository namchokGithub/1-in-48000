import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  SelectionMode,
  ReactFlowProvider,
  applyNodeChanges,
  MarkerType,
  NodeResizer,
  getSmoothStepPath,
  useInternalNode,
  useReactFlow,
  useStore,
  type Connection,
  type Edge,
  type EdgeProps,
  type InternalNode,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type {
  V2Content,
  V2Event,
  V2Flow,
  V2FlowIssue,
  V2FlowNode,
} from '../../content/v2/schema'
import { validateV2Flow } from '../../content/v2/flowValidator'
import { BoDropdown } from './Select'
import { CopyIdButton } from './CopyIdButton'
import { V2ConditionList } from './V2ConditionList'
import { conditionSummary } from './storySummary'
import {
  allEvents,
  matchesEventFilter,
  matchesStoryQuery,
  usedEventIds,
  type EventFilter,
} from './timelineFilters'
import { EventFilterFields } from './EventFilterFields'
import {
  addFlowNode,
  connectPorts,
  edgeStyle,
  finishReconnectEdge,
  flowPorts,
  focusedFlow,
  issuesByNode,
  moveEdgeOrder,
  moveFlowNodes,
  placeEvent,
  reparentFlowNode,
  reconnectEdge,
  removeFlowEdges,
  removeFlowNodes,
  type FlowEdgeStyle,
  type FlowNodeIssues,
  type FlowPort,
} from './flowEditing'
import {
  bottomHandleId,
  floatingTarget,
  outputSide,
  portFromHandle,
  routePath,
  type Box,
  type Side,
} from './flowEdgeGeometry'
import {
  elkLayoutFlow,
  FLOW_GRID,
  type CardMeasure,
  type LayoutDirection,
} from './elkLayout'
import { SimulationPanel } from './SimulationPanel'
import { simulationPath, simulationSave, type Simulation } from './simulation'
import type { FlowBackground } from '../../save/boThemeSettings'
import { periodLabels } from './periodLabels'

type CardData = {
  node: V2FlowNode
  title: string
  kind: string
  eventKind?: V2Event['kind']
  text: string
  thumbnail?: string
  ports: FlowPort[]
  issues?: FlowNodeIssues
}
type Card = Node<CardData, 'card'>
type Group = Node<
  {
    node: Extract<V2FlowNode, { type: 'group' }>
    onResize: (width: number, height: number) => void
  },
  'group'
>
type BoardNode = Card | Group
type FlowLine = Edge<
  { port: string; route?: V2Flow['edges'][number]['route'] },
  'flow'
>
type FlowContextMenu =
  | { kind: 'node'; id: string; x: number; y: number }
  | { kind: 'edge'; id: string; x: number; y: number }
  | {
      kind: 'pane'
      x: number
      y: number
      position: V2FlowNode['position']
    }

const EVENT_DRAG_TYPE = 'application/x-bo-event'
const eventKindLabels: Record<V2Event['kind'], string> = {
  main: 'หลัก',
  conditional: 'มีเงื่อนไข',
  holiday: 'วันหยุด',
  random: 'สุ่ม',
}
const edgeStyleLabels: Record<Exclude<FlowEdgeStyle, 'normal'>, string> = {
  fallback: 'สำรอง',
  pass: 'ผ่าน',
  fail: 'ไม่ผ่าน',
  key: 'ผลการเรียน / ตอนจบ',
}
const edgeColors: Record<FlowEdgeStyle | 'traced' | 'focus', string> = {
  normal: 'var(--bo-edge-normal)',
  fallback: 'var(--bo-edge-normal)',
  pass: 'var(--bo-edge-pass)',
  fail: 'var(--bo-edge-fail)',
  key: 'var(--bo-edge-key)',
  traced: 'var(--bo-edge-traced)',
  focus: 'var(--bo-edge-focus)',
}
const typeLabels: Record<V2FlowNode['type'], string> = {
  start: 'Start',
  event: 'Event',
  condition: 'Condition',
  random: 'Random',
  nextPeriod: 'Next Period',
  ending: 'Ending',
  group: 'Sub Flow',
}
const groupColorOptions = [
  { id: 'gray', label: 'เทา', value: 'var(--bo-group-gray)' },
  { id: 'red', label: 'แดง', value: 'var(--bo-group-red)' },
  { id: 'orange', label: 'ส้ม', value: 'var(--bo-group-orange)' },
  { id: 'yellow', label: 'เหลือง', value: 'var(--bo-group-yellow)' },
  { id: 'green', label: 'เขียว', value: 'var(--bo-group-green)' },
  { id: 'teal', label: 'ทีล', value: 'var(--bo-group-teal)' },
  { id: 'blue', label: 'น้ำเงิน', value: 'var(--bo-group-blue)' },
  { id: 'indigo', label: 'คราม', value: 'var(--bo-group-indigo)' },
  { id: 'purple', label: 'ม่วง', value: 'var(--bo-group-purple)' },
  { id: 'pink', label: 'ชมพู', value: 'var(--bo-group-pink)' },
] as const satisfies readonly {
  id: Extract<V2FlowNode, { type: 'group' }>['color']
  label: string
  value: string
}[]

function cardText(node: V2FlowNode, content: V2Content): string {
  switch (node.type) {
    case 'start':
      return 'จุดเริ่มต้นของเรื่อง'
    case 'event':
      return (
        content.events.find((event) => event.id === node.eventId)?.lines[0]
          ?.text ?? ''
      )
    case 'condition':
      return node.conditions
        .map(conditionSummary)
        .join(node.join === 'and' ? ' และ ' : ' หรือ ')
    case 'random':
      return `สุ่มจาก Pool ${node.poolId}`
    case 'nextPeriod':
      return 'จบช่วงนี้และเลื่อนไปช่วงถัดไป'
    case 'ending':
      return (
        content.endings.find((ending) => ending.id === node.endingId)
          ?.summary ?? ''
      )
    case 'group':
      return 'กลุ่มสำหรับจัดระเบียบการ์ดบนกระดานเท่านั้น'
  }
}

function cardTitle(node: V2FlowNode, content: V2Content): string {
  if (node.type === 'event')
    return (
      content.events.find((event) => event.id === node.eventId)?.title ??
      node.eventId
    )
  if (node.type === 'ending')
    return (
      content.endings.find((ending) => ending.id === node.endingId)?.title ??
      node.endingId
    )
  if (node.type === 'group') return node.title
  return typeLabels[node.type]
}

function FlowCard({ data, selected }: NodeProps<Card>) {
  const { node, issues } = data
  const state = issues?.errors.length
    ? 'error'
    : issues?.warnings.length
      ? 'warning'
      : undefined
  return (
    <div
      className="bo-flow-card"
      data-type={node.type}
      data-kind={data.eventKind}
      data-state={state}
      data-selected={selected}
    >
      {node.type !== 'start' && (
        <>
          <Handle type="target" position={Position.Left} id="in" />
          <Handle type="target" position={Position.Top} id="in-top" />
        </>
      )}
      <div className="bo-flow-card-head bo-drag-handle">
        <span className="bo-flow-kind">{data.kind}</span>
        {data.eventKind && (
          <span className="bo-flow-event-kind">
            {eventKindLabels[data.eventKind]}
          </span>
        )}
        {state && (
          <span
            className="bo-flow-issue-count"
            title={[...issues!.errors, ...issues!.warnings].join('\n')}
          >
            {issues!.errors.length + issues!.warnings.length}
          </span>
        )}
      </div>
      <strong className="bo-flow-title bo-drag-handle">{data.title}</strong>
      {data.thumbnail && (
        <img
          className="bo-flow-thumb bo-drag-handle"
          src={data.thumbnail}
          alt=""
        />
      )}
      {data.text && <p className="bo-flow-text">{data.text}</p>}
      {data.ports.length > 0 && (
        <ul className="bo-flow-ports">
          {data.ports.map((port) => (
            <li key={port.id}>
              <span>{port.label}</span>
              <Handle type="source" position={Position.Right} id={port.id} />
            </li>
          ))}
        </ul>
      )}
      {data.ports.map((port, index) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Bottom}
          id={bottomHandleId(port.id)}
          className="bo-flow-bottom-handle"
          title={port.label}
          style={{ left: `${((index + 1) / (data.ports.length + 1)) * 100}%` }}
        />
      ))}
    </div>
  )
}

function groupColor(color: string | undefined): string {
  return (
    groupColorOptions.find((option) => option.id === color)?.value ??
    'var(--bo-group-green)'
  )
}

type GroupNode = Extract<V2FlowNode, { type: 'group' }>

/** Sub Flows in board order (top to bottom, then left to right), each nested
 * one listed under its parent. */
function subFlowList(
  nodes: V2FlowNode[],
): { group: GroupNode; depth: number; cards: number }[] {
  const groups = nodes.filter(
    (node): node is GroupNode => node.type === 'group',
  )
  const ids = new Set(groups.map((group) => group.id))
  const list: { group: GroupNode; depth: number; cards: number }[] = []
  const visit = (parentId: string | undefined, depth: number) => {
    for (const group of groups
      .filter((item) =>
        parentId
          ? item.parentId === parentId
          : !item.parentId || !ids.has(item.parentId),
      )
      .sort(
        (a, b) => a.position.y - b.position.y || a.position.x - b.position.x,
      )) {
      list.push({
        group,
        depth,
        cards: nodes.filter(
          (node) => node.parentId === group.id && node.type !== 'group',
        ).length,
      })
      visit(group.id, depth + 1)
    }
  }
  visit(undefined, 0)
  return list
}

function FlowGroup({ data, selected }: NodeProps<Group>) {
  const color = groupColor(data.node.color)
  return (
    <div
      className="bo-flow-subflow bo-drag-handle"
      data-selected={selected}
      style={{ '--bo-subflow-color': color } as CSSProperties}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={120}
        handleClassName="bo-flow-subflow-resize-handle"
        lineClassName="bo-flow-subflow-resize-line"
        onResizeEnd={(_, { width, height }) => data.onResize(width, height)}
      />
      <div className="bo-flow-subflow-head">
        <span>Sub Flow</span>
        <strong>{data.node.title}</strong>
      </div>
    </div>
  )
}

const sidePositions: Record<Side, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

function nodeBox(node: InternalNode): Box {
  return {
    ...node.internals.positionAbsolute,
    width: node.measured.width ?? 0,
    height: node.measured.height ?? 0,
  }
}

function FlowLineEdge({
  id,
  source,
  target,
  data,
  label,
  style,
  markerEnd,
}: EdgeProps<FlowLine>) {
  const from = useInternalNode(source)
  const to = useInternalNode(target)
  if (!from || !to || !data) return null
  if (data.route) {
    // Auto layout routed this edge around the cards; draw that route.
    const { path, labelX, labelY } = routePath(data.route)
    return (
      <BaseEdge
        id={id}
        path={path}
        label={label}
        labelX={labelX}
        labelY={labelY}
        style={style}
        markerEnd={markerEnd}
      />
    )
  }
  const fromBox = nodeBox(from)
  const toBox = nodeBox(to)
  const side = outputSide(fromBox, toBox)
  const handleId = side === 'bottom' ? bottomHandleId(data.port) : data.port
  const handle = from.internals.handleBounds?.source?.find(
    (item) => item.id === handleId,
  )
  const start = {
    x: fromBox.x + (handle ? handle.x + handle.width / 2 : fromBox.width),
    y: fromBox.y + (handle ? handle.y + handle.height / 2 : fromBox.height / 2),
  }
  const end = floatingTarget(toBox, start)
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: start.x,
    sourceY: start.y,
    sourcePosition: sidePositions[side],
    targetX: end.x,
    targetY: end.y,
    targetPosition: sidePositions[end.side],
  })
  return (
    <BaseEdge
      id={id}
      path={path}
      label={label}
      labelX={labelX}
      labelY={labelY}
      style={style}
      markerEnd={markerEnd}
    />
  )
}

const nodeTypes = { card: FlowCard, group: FlowGroup }
const edgeTypes = { flow: FlowLineEdge }

type BoardProps = {
  background: FlowBackground
  content: V2Content
  schemaIssues: V2FlowIssue[]
  onChange: (flow: V2Flow) => void
  onSelectEvent: (eventId: string | null) => void
  onEditEvent: (eventId: string) => void
  onCreateEvent: (position: V2FlowNode['position']) => void
  /** Starts a simulation from this event. */
  onPreview: (eventId: string) => void
  simulation: Simulation | null
  onSimulationChange: (simulation: Simulation | null) => void
}

export function FlowBoard(props: BoardProps) {
  return (
    <ReactFlowProvider>
      <Board {...props} />
    </ReactFlowProvider>
  )
}

function Board({
  background,
  content,
  schemaIssues,
  onChange,
  onSelectEvent,
  onEditEvent,
  onCreateEvent,
  onPreview,
  simulation,
  onSimulationChange,
}: BoardProps) {
  const flow = content.flow
  const highlight = useMemo(
    () => (simulation ? simulationPath(simulation) : null),
    [simulation],
  )
  const currentNodeId = simulation
    ? simulationSave(simulation).currentNodeId
    : null
  const boardRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // Simulation panel width in px; null keeps the default half of the stage.
  const [simulationWidth, setSimulationWidth] = useState<number | null>(null)
  const {
    screenToFlowPosition,
    fitView,
    getIntersectingNodes,
    setCenter,
    getInternalNode,
    getZoom,
  } = useReactFlow<BoardNode, FlowLine>()
  // The board opens on the start of the story at a readable zoom: the Start
  // card and the cards up to four steps after it.
  const [openingNodes] = useState(() => {
    const start = flow.nodes.find((node) => node.type === 'start')
    if (!start) return undefined
    const seen = new Set([start.id])
    let frontier = [start.id]
    for (let step = 0; step < 4; step += 1) {
      frontier = flow.edges
        .filter((edge) => frontier.includes(edge.from) && !seen.has(edge.to))
        .map((edge) => edge.to)
      frontier.forEach((id) => seen.add(id))
    }
    return [...seen].map((id) => ({ id }))
  })
  const [query, setQuery] = useState('')
  const [libraryFilter, setLibraryFilter] = useState<EventFilter>(allEvents)
  const [selected, setSelected] = useState<{
    kind: 'node' | 'edge'
    id: string
  } | null>(null)
  const [showIssues, setShowIssues] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [focusDepth, setFocusDepth] = useState(1)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<FlowContextMenu | null>(null)
  const zoomedOut = useStore((state) => state.transform[2] < 0.45)
  const [goTo, setGoTo] = useState('')
  const goToRef = useRef<HTMLInputElement>(null)
  const addMenuRef = useRef<HTMLDetailsElement>(null)
  const subFlowMenuRef = useRef<HTMLDetailsElement>(null)
  const reconnectingEdgeId = useRef<string | null>(null)
  const reconnectSucceeded = useRef(false)

  const report = useMemo(
    () => validateV2Flow(flow, content.events),
    [flow, content.events],
  )
  const errors = useMemo(
    () => [
      ...report.errors,
      ...schemaIssues.filter(
        (issue) =>
          !report.errors.some(
            (item) =>
              item.message === issue.message &&
              item.path.join('.') === issue.path.join('.'),
          ),
      ),
    ],
    [report.errors, schemaIssues],
  )
  const issues = useMemo(
    () => issuesByNode(flow, errors, report.warnings),
    [flow, errors, report.warnings],
  )
  const updateNode = useCallback(
    (next: V2FlowNode) => {
      onChange({
        ...flow,
        nodes: flow.nodes.map((node) => (node.id === next.id ? next : node)),
      })
    },
    [flow, onChange],
  )

  const focusView = useMemo(
    () =>
      selected && focusDepth ? focusedFlow(flow, selected, focusDepth) : null,
    [flow, selected, focusDepth],
  )

  const cards = useMemo<BoardNode[]>(
    () =>
      [...flow.nodes]
        .sort(
          (left, right) =>
            Number(right.type === 'group') - Number(left.type === 'group'),
        )
        .map((node) => {
          if (node.type === 'group')
            return {
              id: node.id,
              type: 'group' as const,
              position: node.position,
              dragHandle: '.bo-drag-handle',
              deletable: true,
              className: 'bo-flow-subflow-node',
              style: { width: node.width, height: node.height },
              data: {
                node,
                onResize: (width, height) =>
                  updateNode({
                    ...node,
                    width: Math.round(width),
                    height: Math.round(height),
                  }),
              },
            }
          const event =
            node.type === 'event'
              ? content.events.find((item) => item.id === node.eventId)
              : undefined
          return {
            id: node.id,
            type: 'card',
            position: node.position,
            parentId: node.parentId,
            // extent: node.parentId ? 'parent' : undefined,
            dragHandle: '.bo-drag-handle',
            deletable: node.type !== 'start',
            className:
              [
                highlight?.nodeIds.includes(node.id) ? 'bo-flow-traced' : '',
                node.id === currentNodeId ? 'bo-flow-current' : '',
                focusView && !focusView.nodeIds.includes(node.id)
                  ? 'bo-flow-dimmed'
                  : '',
              ]
                .filter(Boolean)
                .join(' ') || undefined,
            data: {
              node,
              title: cardTitle(node, content),
              kind: event
                ? `ปี ${event.time.year} · ${periodLabels[event.time.period]}`
                : typeLabels[node.type],
              eventKind: event?.kind,
              text: cardText(node, content),
              thumbnail: content.assets.find(
                (asset) => asset.id === event?.sceneAssetId,
              )?.path,
              ports: flowPorts(node, content.events),
              issues: issues.get(node.id),
            },
          }
        }),
    [
      flow.nodes,
      content,
      issues,
      highlight,
      currentNodeId,
      focusView,
      updateNode,
    ],
  )
  const [nodes, setNodes] = useState<BoardNode[]>(cards)
  const [shownCards, setShownCards] = useState(cards)
  if (shownCards !== cards) {
    setShownCards(cards)
    setNodes((current) =>
      cards.map((card) => {
        const shown = current.find((item) => item.id === card.id)
        return shown
          ? { ...card, selected: shown.selected, measured: shown.measured }
          : card
      }),
    )
  }

  const edges = useMemo<FlowLine[]>(
    () =>
      flow.edges.map((edge) => {
        const focused = focusView?.edgeIds.includes(edge.id)
        const from = flow.nodes.find((node) => node.id === edge.from)
        const choice =
          focused ||
          hoveredEdge === edge.id ||
          (selected?.kind === 'edge' && selected.id === edge.id)
            ? from &&
              flowPorts(from, content.events).find(
                (port) => port.id === edge.port,
              )?.label
            : undefined
        const style = edgeStyle(flow, edge)
        const traced = highlight?.edgeIds.includes(edge.id)
        const label = [
          style === 'fallback' ? 'สำรอง' : undefined,
          choice,
          edge.condition ? conditionSummary(edge.condition) : undefined,
        ]
          .filter(Boolean)
          .join(' · ')
        return {
          id: edge.id,
          source: edge.from,
          sourceHandle: edge.port,
          target: edge.to,
          targetHandle: 'in',
          type: 'flow',
          data: { port: edge.port, route: edge.route },
          label: label || undefined,
          selected: selected?.kind === 'edge' && selected.id === edge.id,
          animated: traced,
          zIndex: focused ? 1 : undefined,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: edgeColors[traced ? 'traced' : focused ? 'focus' : style],
          },
          className:
            [
              `bo-flow-edge-${style}`,
              edge.condition ? 'bo-flow-edge-conditional' : '',
              traced ? 'bo-flow-edge-traced' : '',
              focused ? 'bo-flow-edge-focus' : '',
              focusView && !focused ? 'bo-flow-edge-dimmed' : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined,
        }
      }),
    [flow, content.events, selected, highlight, focusView, hoveredEdge],
  )

  const selectedNode =
    selected?.kind === 'node'
      ? flow.nodes.find((node) => node.id === selected.id)
      : undefined
  const selectedEdge =
    selected?.kind === 'edge'
      ? flow.edges.find((edge) => edge.id === selected.id)
      : undefined
  const placedEventIds = new Set(
    flow.nodes.flatMap((node) => (node.type === 'event' ? [node.eventId] : [])),
  )
  const usedEvents = usedEventIds(flow, content.events)
  const cardCounts = (Object.keys(typeLabels) as V2FlowNode['type'][])
    .filter((type) => type !== 'start')
    .map((type) => ({
      type,
      count: flow.nodes.filter((node) => node.type === type).length,
    }))
    .filter(({ count }) => count > 0)
  const unusedEventCount = content.events.filter(
    (event) => event.active !== false && !usedEvents.has(event.id),
  ).length
  const library = content.events.filter(
    (event) =>
      matchesStoryQuery(event, query) &&
      matchesEventFilter(event, libraryFilter, usedEvents),
  )
  const pools = [
    ...new Set(
      content.events.flatMap((event) =>
        event.pool && event.active !== false ? [event.pool] : [],
      ),
    ),
  ]
  const eventIds = content.events.map((event) => event.id)
  const contextNode =
    contextMenu?.kind === 'node'
      ? flow.nodes.find((node) => node.id === contextMenu.id)
      : undefined
  const contextEdge =
    contextMenu?.kind === 'edge'
      ? flow.edges.find((edge) => edge.id === contextMenu.id)
      : undefined

  function change(next: V2Flow) {
    onChange(next)
  }

  function select(next: typeof selected) {
    setSelected(next)
    const node =
      next?.kind === 'node'
        ? flow.nodes.find((item) => item.id === next.id)
        : undefined
    onSelectEvent(node?.type === 'event' ? node.eventId : null)
  }

  function boardCenter() {
    const rect = boardRef.current?.getBoundingClientRect()
    return screenToFlowPosition({
      x: rect ? rect.left + rect.width / 2 : 0,
      y: rect ? rect.top + rect.height / 2 : 0,
    })
  }

  function place(eventId: string, position = boardCenter()) {
    const next = placeEvent(flow, content.events, eventId, position)
    if (typeof next === 'string') {
      toast.error(next)
      return
    }
    change(next)
    select({ kind: 'node', id: next.nodes.at(-1)!.id })
  }

  function add(
    type: 'condition' | 'random' | 'nextPeriod' | 'ending' | 'group',
    position = boardCenter(),
  ) {
    const next = addFlowNode(flow, content, type, position)
    change(next)
    select({ kind: 'node', id: next.nodes.at(-1)!.id })
  }

  function focus(id: string) {
    const node = flow.nodes.find((item) => item.id === id)
    if (!node) return
    const parent = node.parentId
      ? flow.nodes.find((item) => item.id === node.parentId)
      : undefined
    select({ kind: 'node', id })
    setCenter(
      node.position.x +
        (parent?.type === 'group' ? parent.position.x : 0) +
        120,
      node.position.y + (parent?.type === 'group' ? parent.position.y : 0) + 80,
      {
        zoom: 1,
        duration: 300,
      },
    )
  }

  // Follow the simulation: keep the card being played in view.
  useEffect(() => {
    const node = currentNodeId ? getInternalNode(currentNodeId) : undefined
    if (!node) return
    const { x, y } = node.internals.positionAbsolute
    setCenter(
      x + (node.measured.width ?? 0) / 2,
      y + (node.measured.height ?? 0) / 2,
      { zoom: Math.max(getZoom(), 0.6), duration: 300 },
    )
  }, [currentNodeId, getInternalNode, getZoom, setCenter])

  async function autoLayout(direction: LayoutDirection) {
    // Measure cards at full detail: far zoom hides parts of each card, and a
    // layout from those smaller sizes would overlap once zoomed back in.
    const sizes: Record<string, CardMeasure> = {}
    const board = boardRef.current
    const zoom = board?.getAttribute('data-zoom')
    if (board && zoom) board.removeAttribute('data-zoom')
    board
      ?.querySelectorAll<HTMLElement>('.react-flow__node[data-id]')
      .forEach((element) => {
        if (!element.offsetWidth || !element.offsetHeight) return
        const box = element.getBoundingClientRect()
        const scale = box.width / element.offsetWidth || 1
        const handles: CardMeasure['handles'] = {}
        element
          .querySelectorAll<HTMLElement>('.react-flow__handle[data-handleid]')
          .forEach((handle) => {
            const rect = handle.getBoundingClientRect()
            if (!rect.width && !rect.height) return
            handles[handle.dataset.handleid!] = {
              x: (rect.left + rect.width / 2 - box.left) / scale,
              y: (rect.top + rect.height / 2 - box.top) / scale,
            }
          })
        sizes[element.dataset.id!] = {
          width: element.offsetWidth,
          height: element.offsetHeight,
          handles,
        }
      })
    if (board && zoom) board.setAttribute('data-zoom', zoom)
    try {
      change(await elkLayoutFlow(flow, content.events, { direction, sizes }))
    } catch {
      toast.error('จัดตำแหน่งไม่สำเร็จ')
      return
    }
    toast.success('จัดตำแหน่งแล้ว', {
      description: 'กด Cmd+Z (Ctrl+Z) เพื่อย้อน',
    })
    window.requestAnimationFrame(() => fitView({ duration: 300 }))
  }

  function fitSelected() {
    const ids = selectedNode
      ? [selectedNode.id]
      : selectedEdge
        ? [selectedEdge.from, selectedEdge.to]
        : []
    if (ids.length)
      fitView({ nodes: ids.map((id) => ({ id })), duration: 300, maxZoom: 1 })
  }

  const subFlows = subFlowList(flow.nodes)

  function jumpToSubFlow(id: string) {
    subFlowMenuRef.current?.removeAttribute('open')
    select({ kind: 'node', id })
    fitView({ nodes: [{ id }], duration: 300, maxZoom: 1 })
  }

  const goToQuery = goTo.trim().toLowerCase()
  const goToMatches = goToQuery
    ? flow.nodes
        .filter((node) =>
          [
            node.id,
            node.type === 'event' ? node.eventId : '',
            cardTitle(node, content),
          ].some((text) => text.toLowerCase().includes(goToQuery)),
        )
        .slice(0, 8)
    : []

  function jumpTo(id: string) {
    focus(id)
    setGoTo('')
    goToRef.current?.blur()
  }

  function menuPosition(event: { clientX: number; clientY: number }) {
    return {
      x: Math.min(event.clientX, window.innerWidth - 236),
      y: Math.min(event.clientY, window.innerHeight - 280),
    }
  }

  async function copyFromMenu(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`คัดลอก ${label} แล้ว`)
    } catch {
      toast.error(`คัดลอก ${label} ไม่ได้`)
    }
  }

  function runContextAction(action: () => void) {
    action()
    setContextMenu(null)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (document.querySelector('dialog[open]')) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return
      if (event.code === 'Slash') {
        event.preventDefault()
        goToRef.current?.focus()
      } else if (event.code === 'KeyS' && event.shiftKey) {
        // event.code keeps this working on a Thai keyboard layout.
        event.preventDefault()
        if (selectedNode?.type === 'event') onPreview(selectedNode.eventId)
        else toast.info('เลือกการ์ดเหตุการณ์ก่อน แล้วกด Shift+S')
      } else if (event.code === 'KeyF') {
        event.preventDefault()
        if (selected) fitSelected()
        else fitView({ duration: 300 })
      } else if (event.key === 'Escape') {
        // Close the topmost thing first; a dropdown that handled Escape
        // already called preventDefault.
        if (event.defaultPrevented) return
        if (addMenuRef.current?.open || contextMenu || selected) {
          addMenuRef.current?.removeAttribute('open')
          setContextMenu(null)
          select(null)
        } else if (simulation) onSimulationChange(null)
      }
    }
    function onPointerDown(event: PointerEvent) {
      for (const menu of [addMenuRef.current, subFlowMenuRef.current]) {
        if (menu?.open && !menu.contains(event.target as globalThis.Node))
          menu.removeAttribute('open')
      }
      if (
        contextMenu &&
        !(event.target as HTMLElement).closest('.bo-flow-context-menu')
      )
        setContextMenu(null)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  })

  function onNodesChange(changes: NodeChange<BoardNode>[]) {
    setNodes((current) => applyNodeChanges(changes, current))
    const moved: Record<string, V2FlowNode['position']> = {}
    for (const item of changes) {
      if (item.type === 'position' && item.dragging === false && item.position)
        moved[item.id] = item.position
    }
    if (Object.keys(moved).length) change(moveFlowNodes(flow, moved))
  }

  function onConnect(connection: Connection) {
    if (!connection.sourceHandle) return
    change(
      connectPorts(
        flow,
        connection.source,
        portFromHandle(connection.sourceHandle),
        connection.target,
      ),
    )
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    const eventId = event.dataTransfer.getData(EVENT_DRAG_TYPE)
    if (!eventId) return
    place(eventId, screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }

  const allIssues = [
    ...errors.map((issue) => ({ ...issue, level: 'error' as const })),
    ...report.warnings.map((issue) => ({
      ...issue,
      level: 'warning' as const,
    })),
  ]

  function inspectFlow() {
    if (showIssues) {
      setShowIssues(false)
      return
    }
    const total = allIssues.length
    if (!total) {
      setShowIssues(false)
      toast.success('Story Flow ถูกต้อง')
      return
    }
    const description = [
      errors.length ? `ผิด ${errors.length} จุด` : '',
      report.warnings.length ? `เตือน ${report.warnings.length} จุด` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    const notify = errors.length ? toast.error : toast.warning
    notify('พบจุดที่ต้องตรวจใน Story Flow', {
      description,
      action: { label: 'ดูรายการ', onClick: () => setShowIssues(true) },
    })
  }

  return (
    <div
      className="bo-flow-layout"
      data-library={libraryOpen ? 'open' : 'closed'}
    >
      {libraryOpen && (
        <aside
          id="bo-flow-library"
          className="panel bo-flow-library"
          aria-label="คลังเหตุการณ์"
        >
          <div className="bo-section-heading">
            <h2 className="font-extrabold">คลังเหตุการณ์</h2>
            <button
              type="button"
              className="bo-text-button"
              onClick={() => onCreateEvent(boardCenter())}
            >
              + เหตุการณ์ใหม่
            </button>
          </div>
          <label className="bo-field">
            <span>ค้นหา</span>
            <input
              className="field"
              type="search"
              value={query}
              placeholder="ชื่อ, ID หรือข้อความ"
              onChange={(input) => setQuery(input.target.value)}
            />
          </label>
          <EventFilterFields
            events={content.events}
            value={libraryFilter}
            onChange={setLibraryFilter}
            shown={library.length}
          />
          <ul className="bo-flow-library-list">
            {library.map((event) => {
              const placed = placedEventIds.has(event.id)
              const placeable = !placed && !event.pool && event.active !== false
              return (
                <li
                  key={event.id}
                  draggable={placeable}
                  data-placeable={placeable}
                  onDragStart={(drag) => {
                    drag.dataTransfer.setData(EVENT_DRAG_TYPE, event.id)
                    drag.dataTransfer.effectAllowed = 'copy'
                  }}
                >
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {event.id} · ปี {event.time.year}{' '}
                      {periodLabels[event.time.period]}
                      {event.pool ? ` · Pool ${event.pool}` : ''}
                      {event.active === false ? ' · Inactive' : ''}
                    </small>
                  </div>
                  {placed ? (
                    <button
                      type="button"
                      className="bo-text-button"
                      onClick={() =>
                        focus(
                          flow.nodes.find(
                            (node) =>
                              node.type === 'event' &&
                              node.eventId === event.id,
                          )!.id,
                        )
                      }
                    >
                      ดูบนกระดาน
                    </button>
                  ) : placeable ? (
                    <button
                      type="button"
                      className="bo-text-button"
                      onClick={() => place(event.id)}
                    >
                      วาง
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {!library.length && (
            <p className="muted text-sm">ไม่พบเหตุการณ์ที่ค้นหา</p>
          )}
        </aside>
      )}

      <section className="panel bo-flow-main" aria-label="กระดาน Flow">
        <div
          className="bo-flow-actions"
          role="toolbar"
          aria-label="เครื่องมือกระดาน"
        >
          <div className="bo-flow-group" role="group" aria-label="แก้กระดาน">
            <button
              type="button"
              className="button button-secondary"
              aria-expanded={libraryOpen}
              aria-controls="bo-flow-library"
              onClick={() => setLibraryOpen((value) => !value)}
            >
              {libraryOpen ? 'ซ่อนคลัง' : 'คลังเหตุการณ์'}
            </button>
            <details ref={addMenuRef} className="bo-flow-menu">
              <summary className="button button-secondary">+ เพิ่ม ▾</summary>
              <div className="bo-flow-menu-list">
                <button
                  type="button"
                  onClick={() => {
                    addMenuRef.current?.removeAttribute('open')
                    onCreateEvent(boardCenter())
                  }}
                >
                  เหตุการณ์ใหม่
                </button>
                {(
                  [
                    'condition',
                    'random',
                    'nextPeriod',
                    'ending',
                    'group',
                  ] as const
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      addMenuRef.current?.removeAttribute('open')
                      add(type)
                    }}
                  >
                    {typeLabels[type]}
                  </button>
                ))}
              </div>
            </details>
          </div>
          <details ref={subFlowMenuRef} className="bo-flow-menu">
            <summary className="button button-secondary bo-flow-check">
              Sub Flow
              <Badge variant="secondary">{subFlows.length}</Badge>
              <span aria-hidden="true">▾</span>
            </summary>
            <div className="bo-flow-menu-list bo-subflow-list">
              {subFlows.length ? (
                subFlows.map(({ group, depth, cards }) => (
                  <button
                    key={group.id}
                    type="button"
                    style={{ paddingLeft: `${0.6 + depth}rem` }}
                    onClick={() => jumpToSubFlow(group.id)}
                  >
                    <span
                      className="bo-subflow-dot"
                      style={{ background: groupColor(group.color) }}
                      aria-hidden="true"
                    />
                    <span className="bo-subflow-title">{group.title}</span>
                    <Badge variant="secondary" title="จำนวนการ์ดข้างใน">
                      {cards}
                    </Badge>
                  </button>
                ))
              ) : (
                <p className="muted text-xs">ยังไม่มี Sub Flow</p>
              )}
            </div>
          </details>
          <div className="bo-flow-goto">
            <input
              ref={goToRef}
              className="field"
              type="search"
              value={goTo}
              placeholder="ไปที่การ์ด… ( / )"
              aria-label="ไปที่การ์ด"
              onChange={(input) => setGoTo(input.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && goToMatches[0])
                  jumpTo(goToMatches[0].id)
                else if (event.key === 'Escape') {
                  setGoTo('')
                  event.currentTarget.blur()
                }
              }}
            />
            {goToQuery && (
              <ul className="bo-flow-goto-list">
                {goToMatches.length ? (
                  goToMatches.map((node) => (
                    <li key={node.id}>
                      <button type="button" onClick={() => jumpTo(node.id)}>
                        <strong>{cardTitle(node, content)}</strong>
                        <small>
                          {typeLabels[node.type]} · {node.id}
                        </small>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="muted">ไม่พบการ์ด</li>
                )}
              </ul>
            )}
          </div>
          <p className="bo-flow-counts" aria-label="จำนวนการ์ดบนกระดาน">
            {cardCounts.map(({ type, count }) => (
              <Badge key={type} variant="secondary">
                {typeLabels[type]} {count}
              </Badge>
            ))}
            {unusedEventCount > 0 && (
              <Badge
                variant="outline"
                title="เหตุการณ์ที่เปิดใช้อยู่แต่ยังไม่ได้วางบนกระดานหรืออยู่ใน Pool ที่การ์ดสุ่มใช้"
              >
                ยังไม่ได้ใช้ {unusedEventCount}
              </Badge>
            )}
          </p>
          <span className="bo-flow-actions-gap" />
          <div className="bo-flow-group" role="group" aria-label="มุมมอง">
            <BoDropdown
              label="ระยะโฟกัส"
              className="field bo-flow-focus"
              value={String(focusDepth)}
              onChange={(input) => setFocusDepth(Number(input.target.value))}
            >
              <option value="0">โฟกัส: ปิด</option>
              <option value="1">โฟกัส: 1 ขั้น</option>
              <option value="2">โฟกัส: 2 ขั้น</option>
              <option value="3">โฟกัส: 3 ขั้น</option>
            </BoDropdown>
            <details className="bo-flow-menu">
              <summary className="button button-secondary">มุมมอง ▾</summary>
              <div className="bo-flow-menu-list">
                <button
                  type="button"
                  title="คีย์ลัด F เมื่อไม่ได้เลือกอะไร"
                  onClick={() => fitView({ duration: 300 })}
                >
                  พอดีจอทั้งหมด
                </button>
                <button
                  type="button"
                  title="คีย์ลัด F เมื่อเลือกการ์ดหรือเส้น"
                  disabled={!selectedNode && !selectedEdge}
                  onClick={fitSelected}
                >
                  พอดีจอเฉพาะที่เลือก
                </button>
                <button
                  type="button"
                  onClick={() => void autoLayout('horizontal')}
                >
                  จัดแนวนอน (ซ้ายไปขวา)
                </button>
                <button
                  type="button"
                  onClick={() => void autoLayout('vertical')}
                >
                  จัดแนวตั้ง (บนลงล่าง)
                </button>
              </div>
            </details>
          </div>
          <button
            type="button"
            className="button button-secondary bo-flow-check"
            aria-pressed={showIssues}
            onClick={inspectFlow}
          >
            ตรวจ
            <Badge variant={errors.length ? 'destructive' : 'outline'}>
              ผิด {errors.length}
            </Badge>
            <Badge variant={report.warnings.length ? 'warning' : 'outline'}>
              เตือน {report.warnings.length}
            </Badge>
          </button>
        </div>
        {showIssues && (
          <ul className="bo-flow-issues">
            {allIssues.length ? (
              allIssues.map((issue, index) => {
                const [collection, position] = issue.path
                const id =
                  collection === 'nodes' && typeof position === 'number'
                    ? flow.nodes[position]?.id
                    : collection === 'edges' && typeof position === 'number'
                      ? flow.edges[position]?.from
                      : undefined
                return (
                  <li key={index} data-level={issue.level}>
                    <button
                      type="button"
                      className="bo-text-button"
                      disabled={!id}
                      onClick={() => id && focus(id)}
                    >
                      {issue.level === 'error' ? 'ผิด' : 'เตือน'} —{' '}
                      {issue.message}
                    </button>
                  </li>
                )
              })
            ) : (
              <li>ไม่พบปัญหา</li>
            )}
          </ul>
        )}
        <div
          ref={stageRef}
          className="bo-flow-stage"
          data-simulation={simulation ? 'open' : undefined}
          style={
            simulationWidth === null
              ? undefined
              : ({
                  '--bo-simulation-width': `${simulationWidth}px`,
                } as CSSProperties)
          }
        >
          <div className="bo-flow-board">
            <div
              ref={boardRef}
              className="bo-flow-canvas"
              data-zoom={zoomedOut ? 'far' : undefined}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes(EVENT_DRAG_TYPE)) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'copy'
                }
              }}
              onDrop={onDrop}
            >
              <ReactFlow<BoardNode, FlowLine>
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                snapToGrid
                snapGrid={[FLOW_GRID, FLOW_GRID]}
                onConnect={onConnect}
                onReconnectStart={(_, edge) => {
                  reconnectingEdgeId.current = edge.id
                  reconnectSucceeded.current = false
                }}
                onReconnect={(edge, connection) => {
                  reconnectSucceeded.current = true
                  if (!connection.sourceHandle) return
                  const next = reconnectEdge(
                    flow,
                    edge.id,
                    connection.source,
                    portFromHandle(connection.sourceHandle),
                    connection.target,
                  )
                  if (next === flow) toast.error('ต่อเส้นไปที่นั่นไม่ได้')
                  else change(next)
                }}
                onReconnectEnd={(_, edge) => {
                  const next = finishReconnectEdge(
                    flow,
                    reconnectingEdgeId.current ?? edge.id,
                    reconnectSucceeded.current,
                  )
                  reconnectingEdgeId.current = null
                  if (next !== flow) change(next)
                }}
                onNodesDelete={(deleted) =>
                  change(
                    removeFlowNodes(
                      flow,
                      deleted.map((node) => node.id),
                    ),
                  )
                }
                onNodeDragStop={(_, dragged) => {
                  const node = flow.nodes.find((item) => item.id === dragged.id)
                  if (!node || node.type === 'group') return
                  const group = getIntersectingNodes(dragged).find(
                    (candidate) => candidate.type === 'group',
                  )
                  if (group?.id !== node.parentId)
                    change(
                      reparentFlowNode(
                        moveFlowNodes(flow, { [node.id]: dragged.position }),
                        node.id,
                        group?.id,
                      ),
                    )
                }}
                onEdgesDelete={(deleted) =>
                  change(
                    removeFlowEdges(
                      flow,
                      deleted.map((edge) => edge.id),
                    ),
                  )
                }
                onNodeClick={(_, node) => select({ kind: 'node', id: node.id })}
                onNodeContextMenu={(event, node) => {
                  if (event.shiftKey) return
                  event.preventDefault()
                  select({ kind: 'node', id: node.id })
                  setContextMenu({
                    kind: 'node',
                    id: node.id,
                    ...menuPosition(event),
                  })
                }}
                onNodeDoubleClick={(_, node) => {
                  if (node.data.node.type === 'event')
                    onEditEvent(node.data.node.eventId)
                }}
                zoomOnDoubleClick={false}
                onEdgeClick={(_, edge) => select({ kind: 'edge', id: edge.id })}
                onEdgeContextMenu={(event, edge) => {
                  if (event.shiftKey) return
                  event.preventDefault()
                  select({ kind: 'edge', id: edge.id })
                  setContextMenu({
                    kind: 'edge',
                    id: edge.id,
                    ...menuPosition(event),
                  })
                }}
                onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
                onEdgeMouseLeave={() => setHoveredEdge(null)}
                onPaneClick={() => {
                  setContextMenu(null)
                  select(null)
                }}
                onPaneContextMenu={(event) => {
                  if (event.shiftKey) return
                  event.preventDefault()
                  const client =
                    'nativeEvent' in event ? event.nativeEvent : event
                  setContextMenu({
                    kind: 'pane',
                    ...menuPosition(client),
                    position: screenToFlowPosition({
                      x: client.clientX,
                      y: client.clientY,
                    }),
                  })
                }}
                selectionOnDrag={true}
                selectionMode={SelectionMode.Partial}
                panOnDrag={[1, 2]}
                panOnScroll={true}
                multiSelectionKeyCode={['Meta', 'Control']}
                deleteKeyCode={['Backspace', 'Delete']}
                minZoom={0.15}
                fitView
                fitViewOptions={{
                  nodes: openingNodes,
                  maxZoom: 1,
                  padding: 0.2,
                }}
              >
                <Background
                  color="var(--bo-flow-grid)"
                  gap={FLOW_GRID}
                  variant={
                    {
                      dots: BackgroundVariant.Dots,
                      cross: BackgroundVariant.Cross,
                      lines: BackgroundVariant.Lines,
                    }[background]
                  }
                />
                <Controls />
                {!selectedNode && !selectedEdge && (
                  <MiniMap pannable zoomable />
                )}
                <Panel position="bottom-center">
                  <details className="bo-flow-legend-toggle">
                    <summary>คำอธิบายสัญลักษณ์</summary>
                    <div className="bo-flow-legend">
                      {Object.entries(eventKindLabels).map(([kind, label]) => (
                        <span key={kind} data-kind={kind}>
                          {label}
                        </span>
                      ))}
                      <span className="bo-flow-legend-sep" aria-hidden="true" />
                      <span data-edge="conditional">มีเงื่อนไข</span>
                      {Object.entries(edgeStyleLabels).map(([style, label]) => (
                        <span key={style} data-edge={style}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </details>
                </Panel>
                {!selectedNode && !selectedEdge && (
                  <Panel position="top-left" className="bo-flow-hint">
                    เลือกการ์ดหรือเส้นเพื่อแก้
                    ลากจากจุดขวาของตัวเลือกไปยังการ์ดถัดไปเพื่อเชื่อมเส้น ·
                    คีย์ลัด / ค้นหา · F พอดีจอ · Esc ยกเลิกการเลือก
                  </Panel>
                )}
              </ReactFlow>
            </div>
            {(selectedNode || selectedEdge) && (
              <aside className="bo-flow-drawer" aria-label="รายละเอียดที่เลือก">
                <button
                  type="button"
                  className="bo-text-button bo-flow-drawer-close"
                  onClick={() => select(null)}
                >
                  ปิด ✕
                </button>
                {selectedNode ? (
                  <NodeDetail
                    node={selectedNode}
                    content={content}
                    pools={pools}
                    eventIds={eventIds}
                    groups={flow.nodes.filter(
                      (item): item is Extract<V2FlowNode, { type: 'group' }> =>
                        item.type === 'group',
                    )}
                    issues={issues.get(selectedNode.id)}
                    onChange={updateNode}
                    onReparent={(parentId) =>
                      change(reparentFlowNode(flow, selectedNode.id, parentId))
                    }
                    onRemove={() => {
                      change(removeFlowNodes(flow, [selectedNode.id]))
                      select(null)
                    }}
                    onEditEvent={onEditEvent}
                    onPreview={onPreview}
                  />
                ) : selectedEdge ? (
                  <div className="bo-stack">
                    <p className="eyebrow">เส้นเชื่อม</p>
                    <h2 className="text-lg font-extrabold">
                      {cardTitle(
                        flow.nodes.find(
                          (node) => node.id === selectedEdge.from,
                        )!,
                        content,
                      )}{' '}
                      →{' '}
                      {cardTitle(
                        flow.nodes.find((node) => node.id === selectedEdge.to)!,
                        content,
                      )}
                    </h2>
                    <p className="muted text-sm">
                      ทาง:{' '}
                      {flowPorts(
                        flow.nodes.find(
                          (node) => node.id === selectedEdge.from,
                        )!,
                        content.events,
                      ).find((port) => port.id === selectedEdge.port)?.label ??
                        selectedEdge.port}
                    </p>
                    <section className="bo-editor-section">
                      <h3>เงื่อนไขบนเส้น (ไม่เกิน 1 ข้อ)</h3>
                      <V2ConditionList
                        value={
                          selectedEdge.condition ? [selectedEdge.condition] : []
                        }
                        eventIds={eventIds}
                        catalogs={content}
                        onChange={(conditions) =>
                          change({
                            ...flow,
                            edges: flow.edges.map((edge) => {
                              if (edge.id !== selectedEdge.id) return edge
                              const { condition: _removed, ...rest } = edge
                              void _removed
                              const condition = conditions.at(-1)
                              return condition ? { ...rest, condition } : rest
                            }),
                          })
                        }
                      />
                    </section>
                    <p className="muted text-xs">
                      เส้นจากทางเดียวกันตรวจตามลำดับ
                      เส้นแรกที่เงื่อนไขผ่านจะถูกใช้
                      เส้นที่ไม่มีเงื่อนไขทำหน้าที่เป็นทางสำรอง
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          change(moveEdgeOrder(flow, selectedEdge.id, -1))
                        }
                      >
                        ↑ ตรวจก่อน
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          change(moveEdgeOrder(flow, selectedEdge.id, 1))
                        }
                      >
                        ↓ ตรวจทีหลัง
                      </button>
                    </div>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => {
                        change(removeFlowEdges(flow, [selectedEdge.id]))
                        select(null)
                      }}
                    >
                      ลบเส้น
                    </button>
                  </div>
                ) : null}
              </aside>
            )}
          </div>
          {simulation && (
            <div
              className="bo-simulation-resize"
              role="separator"
              aria-orientation="vertical"
              aria-label="ปรับความกว้างแผง Simulation"
              title="ลากเพื่อปรับความกว้าง · ดับเบิลคลิกเพื่อกลับไปครึ่งจอ"
              tabIndex={0}
              onPointerDown={(event) => {
                event.preventDefault()
                event.currentTarget.setPointerCapture(event.pointerId)
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId))
                  return
                const stage = stageRef.current?.getBoundingClientRect()
                if (stage)
                  setSimulationWidth(
                    Math.round(
                      stage.right -
                        event.clientX -
                        event.currentTarget.offsetWidth / 2,
                    ),
                  )
              }}
              onDoubleClick={() => setSimulationWidth(null)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                  return
                event.preventDefault()
                const panel = event.currentTarget
                  .nextElementSibling as HTMLElement | null
                const width = panel?.offsetWidth ?? 0
                setSimulationWidth(
                  width + (event.key === 'ArrowLeft' ? FLOW_GRID : -FLOW_GRID),
                )
              }}
            />
          )}
          {simulation && (
            <SimulationPanel
              simulation={simulation}
              draft={content}
              onChange={onSimulationChange}
              onExit={() => onSimulationChange(null)}
            />
          )}
        </div>
      </section>
      {contextMenu && (
        <div
          className="bo-flow-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(event) => event.preventDefault()}
        >
          {contextNode && (
            <>
              <p className="bo-flow-context-label">
                {typeLabels[contextNode.type]}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  runContextAction(() =>
                    select({ kind: 'node', id: contextNode.id }),
                  )
                }
              >
                ดูรายละเอียด
              </button>
              {contextNode.type === 'event' && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runContextAction(() => onEditEvent(contextNode.eventId))
                    }
                  >
                    แก้เหตุการณ์
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runContextAction(() => onPreview(contextNode.eventId))
                    }
                  >
                    ทดลองเหตุการณ์{' '}
                    <kbd className="bo-simulation-kbd">Shift+S</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runContextAction(() => {
                        void copyFromMenu(contextNode.eventId, 'Event ID')
                      })
                    }
                  >
                    คัดลอก Event ID
                  </button>
                </>
              )}
              {contextNode.type === 'group' && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runContextAction(() =>
                      fitView({
                        nodes: [{ id: contextNode.id }],
                        duration: 300,
                        maxZoom: 1,
                      }),
                    )
                  }
                >
                  พอดีจอกลุ่มนี้
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  runContextAction(() => {
                    void copyFromMenu(contextNode.id, 'Node ID')
                  })
                }
              >
                คัดลอก Node ID
              </button>
              {contextNode.type !== 'start' && (
                <button
                  type="button"
                  role="menuitem"
                  className="bo-flow-context-danger"
                  onClick={() =>
                    runContextAction(() => {
                      change(removeFlowNodes(flow, [contextNode.id]))
                      select(null)
                    })
                  }
                >
                  {contextNode.type === 'group'
                    ? 'ลบ Sub Flow'
                    : 'นำออกจากกระดาน'}
                </button>
              )}
            </>
          )}
          {contextEdge && (
            <>
              <p className="bo-flow-context-label">เส้นเชื่อม</p>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  runContextAction(() =>
                    select({ kind: 'edge', id: contextEdge.id }),
                  )
                }
              >
                แก้เงื่อนไขบนเส้น
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  runContextAction(() =>
                    change(moveEdgeOrder(flow, contextEdge.id, -1)),
                  )
                }
              >
                ↑ ตรวจก่อน
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  runContextAction(() =>
                    change(moveEdgeOrder(flow, contextEdge.id, 1)),
                  )
                }
              >
                ↓ ตรวจทีหลัง
              </button>
              <button
                type="button"
                role="menuitem"
                className="bo-flow-context-danger"
                onClick={() =>
                  runContextAction(() => {
                    change(removeFlowEdges(flow, [contextEdge.id]))
                    select(null)
                  })
                }
              >
                ลบเส้น
              </button>
            </>
          )}
          {contextMenu.kind === 'pane' && (
            <>
              <p className="bo-flow-context-label">เพิ่มบนกระดาน</p>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  runContextAction(() => onCreateEvent(contextMenu.position))
                }
              >
                เหตุการณ์ใหม่
              </button>
              {(
                [
                  'condition',
                  'random',
                  'nextPeriod',
                  'ending',
                  'group',
                ] as const
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runContextAction(() => add(type, contextMenu.position))
                  }
                >
                  {typeLabels[type]}
                </button>
              ))}
              <button
                type="button"
                role="menuitem"
                onClick={() => runContextAction(() => setLibraryOpen(true))}
              >
                เปิดคลังเหตุการณ์
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NodeDetail({
  node,
  content,
  pools,
  eventIds,
  groups,
  issues,
  onChange,
  onReparent,
  onRemove,
  onEditEvent,
  onPreview,
}: {
  node: V2FlowNode
  content: V2Content
  pools: string[]
  eventIds: string[]
  groups: Extract<V2FlowNode, { type: 'group' }>[]
  issues?: FlowNodeIssues
  onChange: (node: V2FlowNode) => void
  onReparent: (parentId?: string) => void
  onRemove: () => void
  onEditEvent: (eventId: string) => void
  onPreview: (eventId: string) => void
}) {
  return (
    <div className="bo-stack">
      <p className="eyebrow">{typeLabels[node.type]}</p>
      <h2 className="text-lg font-extrabold">{cardTitle(node, content)}</h2>
      <div className="bo-flow-ids">
        <span className="muted text-xs">Node ID: {node.id}</span>
        <CopyIdButton value={node.id} label="Node ID" />
      </div>
      {node.type === 'event' && (
        <div className="bo-flow-ids">
          <span className="muted text-xs">Event ID: {node.eventId}</span>
          <CopyIdButton value={node.eventId} label="Event ID" />
        </div>
      )}
      {issues &&
        [...issues.errors, ...issues.warnings].map((issue, index) => (
          <p
            key={index}
            className={
              index < issues.errors.length
                ? 'bo-field-error'
                : 'bo-flow-warning'
            }
          >
            {issue}
          </p>
        ))}
      {node.type === 'event' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onEditEvent(node.eventId)}
          >
            แก้ในฟอร์มเหตุการณ์
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => onPreview(node.eventId)}
            title="กด Shift+S เพื่อทดลองการ์ดที่เลือก"
          >
            ทดลองเหตุการณ์ <kbd className="bo-simulation-kbd">Shift+S</kbd>
          </button>
        </div>
      )}
      {node.type === 'condition' && (
        <>
          <label className="bo-field">
            <span>วิธีรวมเงื่อนไข</span>
            <BoDropdown
              value={node.join}
              onChange={(input) =>
                onChange({
                  ...node,
                  join: input.target.value === 'or' ? 'or' : 'and',
                })
              }
            >
              <option value="and">ผ่านทุกข้อ (AND)</option>
              <option value="or">ผ่านอย่างน้อยหนึ่งข้อ (OR)</option>
            </BoDropdown>
          </label>
          <V2ConditionList
            value={node.conditions}
            eventIds={eventIds}
            catalogs={content}
            onChange={(conditions) => onChange({ ...node, conditions })}
          />
        </>
      )}
      {node.type === 'random' && (
        <label className="bo-field">
          <span>Pool ที่สุ่ม</span>
          <BoDropdown
            value={node.poolId}
            onChange={(input) =>
              onChange({ ...node, poolId: input.target.value })
            }
          >
            {[...new Set([node.poolId, ...pools])].map((pool) => (
              <option key={pool} value={pool}>
                {pool}
              </option>
            ))}
          </BoDropdown>
          <small className="muted">
            ตั้ง Pool ให้เหตุการณ์ได้ในฟอร์มเหตุการณ์
          </small>
        </label>
      )}
      {node.type === 'ending' && (
        <label className="bo-field">
          <span>ตอนจบ</span>
          <BoDropdown
            value={node.endingId}
            onChange={(input) =>
              onChange({ ...node, endingId: input.target.value })
            }
          >
            {content.endings.map((ending) => (
              <option key={ending.id} value={ending.id}>
                {ending.title}
              </option>
            ))}
          </BoDropdown>
        </label>
      )}
      {node.type === 'nextPeriod' && (
        <p className="muted text-sm">
          ใช้ “ช่วงถัดไป” ตามปกติ เมื่อจบซัมเมอร์ของปีที่ต้องตรวจผลการเรียน
          ระบบเลือก “จบการศึกษา” หรือ “เรียนต่อ” เอง
        </p>
      )}
      {node.type === 'group' && (
        <>
          <label className="bo-field">
            <span>ชื่อ Sub Flow</span>
            <input
              className="field"
              value={node.title}
              onChange={(input) =>
                onChange({ ...node, title: input.target.value })
              }
            />
          </label>
          <div className="bo-field">
            <span>สี</span>
            <div
              className="bo-flow-color-palette"
              role="radiogroup"
              aria-label="สี Sub Flow"
            >
              {groupColorOptions.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className="bo-flow-color-swatch"
                  role="radio"
                  aria-checked={node.color === color.id}
                  aria-label={color.label}
                  title={color.label}
                  style={{ backgroundColor: color.value }}
                  onClick={() => onChange({ ...node, color: color.id })}
                />
              ))}
            </div>
          </div>
          <div className="bo-form-grid">
            <label className="bo-field">
              <span>กว้าง</span>
              <input
                className="field"
                type="number"
                min="160"
                value={node.width}
                onChange={(input) =>
                  onChange({
                    ...node,
                    width: Math.max(160, Number(input.target.value) || 160),
                  })
                }
              />
            </label>
            <label className="bo-field">
              <span>สูง</span>
              <input
                className="field"
                type="number"
                min="120"
                value={node.height}
                onChange={(input) =>
                  onChange({
                    ...node,
                    height: Math.max(120, Number(input.target.value) || 120),
                  })
                }
              />
            </label>
          </div>
          <p className="muted text-sm">
            กลุ่มนี้ไม่เปลี่ยนเส้นทางที่ผู้เล่นเล่น
          </p>
        </>
      )}
      {node.type !== 'start' && node.type !== 'group' && (
        <label className="bo-field">
          <span>Sub Flow</span>
          <BoDropdown
            value={node.parentId ?? ''}
            onChange={(input) => onReparent(input.target.value || undefined)}
          >
            <option value="">ไม่อยู่ใน Sub Flow</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title}
              </option>
            ))}
          </BoDropdown>
        </label>
      )}
      {node.type !== 'start' && (
        <button
          type="button"
          className="button button-danger"
          onClick={onRemove}
        >
          นำออกจากกระดาน
        </button>
      )}
    </div>
  )
}
