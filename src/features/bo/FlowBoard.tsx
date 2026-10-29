import { useMemo, useRef, useState, type DragEvent } from 'react'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
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
import { V2ConditionList } from './V2ConditionList'
import { conditionSummary } from './storySummary'
import { matchesStoryQuery } from './timelineFilters'
import {
  addFlowNode,
  connectPorts,
  flowPorts,
  issuesByNode,
  layoutFlow,
  moveEdgeOrder,
  moveFlowNodes,
  placeEvent,
  removeFlowEdges,
  removeFlowNodes,
  type FlowNodeIssues,
  type FlowPort,
} from './flowEditing'

type CardData = {
  node: V2FlowNode
  title: string
  kind: string
  text: string
  thumbnail?: string
  ports: FlowPort[]
  issues?: FlowNodeIssues
}
type Card = Node<CardData, 'card'>

const EVENT_DRAG_TYPE = 'application/x-bo-event'
const periodLabels: Record<V2Event['time']['period'], string> = {
  term1: 'เทอม 1',
  break: 'ปิดเทอม',
  term2: 'เทอม 2',
  summer: 'ซัมเมอร์',
}
const typeLabels: Record<V2FlowNode['type'], string> = {
  start: 'Start',
  event: 'Event',
  condition: 'Condition',
  random: 'Random',
  nextPeriod: 'Next Period',
  ending: 'Ending',
}

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
      data-state={state}
      data-selected={selected}
    >
      {node.type !== 'start' && (
        <Handle type="target" position={Position.Left} id="in" />
      )}
      <div className="bo-flow-card-head">
        <span className="bo-flow-kind">{data.kind}</span>
        {state && (
          <span
            className="bo-flow-issue-count"
            title={[...issues!.errors, ...issues!.warnings].join('\n')}
          >
            {issues!.errors.length + issues!.warnings.length}
          </span>
        )}
      </div>
      <strong className="bo-flow-title">{data.title}</strong>
      {data.thumbnail && (
        <img className="bo-flow-thumb" src={data.thumbnail} alt="" />
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
    </div>
  )
}

const nodeTypes = { card: FlowCard }

type BoardProps = {
  content: V2Content
  schemaIssues: V2FlowIssue[]
  onChange: (flow: V2Flow) => void
  onSelectEvent: (eventId: string | null) => void
  onEditEvent: (eventId: string) => void
  onCreateEvent: (position: V2FlowNode['position']) => void
  onPreview: (eventId: string) => void
}

export function FlowBoard(props: BoardProps) {
  return (
    <ReactFlowProvider>
      <Board {...props} />
    </ReactFlowProvider>
  )
}

function Board({
  content,
  schemaIssues,
  onChange,
  onSelectEvent,
  onEditEvent,
  onCreateEvent,
  onPreview,
}: BoardProps) {
  const flow = content.flow
  const boardRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView, setCenter } = useReactFlow()
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [period, setPeriod] = useState('all')
  const [selected, setSelected] = useState<{
    kind: 'node' | 'edge'
    id: string
  } | null>(null)
  const [message, setMessage] = useState('')
  const [showIssues, setShowIssues] = useState(false)

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

  const cards = useMemo<Card[]>(
    () =>
      flow.nodes.map((node) => {
        const event =
          node.type === 'event'
            ? content.events.find((item) => item.id === node.eventId)
            : undefined
        return {
          id: node.id,
          type: 'card',
          position: node.position,
          deletable: node.type !== 'start',
          data: {
            node,
            title: cardTitle(node, content),
            kind: event
              ? `ปี ${event.time.year} · ${periodLabels[event.time.period]}`
              : typeLabels[node.type],
            text: cardText(node, content),
            thumbnail: content.assets.find(
              (asset) => asset.id === event?.sceneAssetId,
            )?.path,
            ports: flowPorts(node, content.events),
            issues: issues.get(node.id),
          },
        }
      }),
    [flow.nodes, content, issues],
  )
  const [nodes, setNodes] = useState<Card[]>(cards)
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

  const edges = useMemo<Edge[]>(
    () =>
      flow.edges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        sourceHandle: edge.port,
        target: edge.to,
        targetHandle: 'in',
        label: edge.condition ? conditionSummary(edge.condition) : undefined,
        selected: selected?.kind === 'edge' && selected.id === edge.id,
        className: edge.condition ? 'bo-flow-edge-conditional' : undefined,
      })),
    [flow.edges, selected],
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
  const library = content.events.filter(
    (event) =>
      matchesStoryQuery(event, query) &&
      (year === 'all' || event.time.year === Number(year)) &&
      (period === 'all' || event.time.period === period),
  )
  const pools = [
    ...new Set(
      content.events.flatMap((event) =>
        event.pool && event.active !== false ? [event.pool] : [],
      ),
    ),
  ]
  const eventIds = content.events.map((event) => event.id)

  function change(next: V2Flow) {
    setMessage('')
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
      setMessage(next)
      return
    }
    change(next)
    select({ kind: 'node', id: next.nodes.at(-1)!.id })
  }

  function add(type: 'condition' | 'random' | 'nextPeriod' | 'ending') {
    const next = addFlowNode(flow, content, type, boardCenter())
    change(next)
    select({ kind: 'node', id: next.nodes.at(-1)!.id })
  }

  function updateNode(next: V2FlowNode) {
    change({
      ...flow,
      nodes: flow.nodes.map((node) => (node.id === next.id ? next : node)),
    })
  }

  function focus(id: string) {
    const node = flow.nodes.find((item) => item.id === id)
    if (!node) return
    select({ kind: 'node', id })
    setCenter(node.position.x + 120, node.position.y + 80, {
      zoom: 1,
      duration: 300,
    })
  }

  function onNodesChange(changes: NodeChange<Card>[]) {
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
        connection.sourceHandle,
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

  return (
    <div className="bo-flow-layout mt-3">
      <aside className="panel bo-flow-library" aria-label="คลังเหตุการณ์">
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
        <div className="bo-form-grid">
          <label className="bo-field">
            <span>ปี</span>
            <BoDropdown
              value={year}
              onChange={(input) => setYear(input.target.value)}
            >
              <option value="all">ทุกปี</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                <option key={value} value={String(value)}>
                  ปี {value}
                </option>
              ))}
            </BoDropdown>
          </label>
          <label className="bo-field">
            <span>ช่วงเวลา</span>
            <BoDropdown
              value={period}
              onChange={(input) => setPeriod(input.target.value)}
            >
              <option value="all">ทุกช่วง</option>
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </BoDropdown>
          </label>
        </div>
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
                            node.type === 'event' && node.eventId === event.id,
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

      <section className="panel bo-flow-main" aria-label="กระดาน Flow">
        <div
          className="bo-flow-actions"
          role="toolbar"
          aria-label="เครื่องมือกระดาน"
        >
          <button
            type="button"
            className="button button-secondary"
            onClick={() => add('condition')}
          >
            + Condition
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => add('random')}
          >
            + Random
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => add('nextPeriod')}
          >
            + Next Period
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => add('ending')}
          >
            + Ending
          </button>
          <span className="bo-flow-actions-gap" />
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              change(layoutFlow(flow))
              window.requestAnimationFrame(() => fitView({ duration: 300 }))
            }}
          >
            จัดตำแหน่งอัตโนมัติ
          </button>
          <button
            type="button"
            className="button button-secondary"
            aria-pressed={showIssues}
            onClick={() => setShowIssues((value) => !value)}
          >
            ตรวจความถูกต้อง · {errors.length} ผิด · {report.warnings.length}{' '}
            เตือน
          </button>
        </div>
        {message && (
          <p className="bo-notice" role="status">
            {message}
          </p>
        )}
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
          ref={boardRef}
          className="bo-flow-canvas"
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes(EVENT_DRAG_TYPE)) {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
            }
          }}
          onDrop={onDrop}
        >
          <ReactFlow<Card>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onNodesDelete={(deleted) =>
              change(
                removeFlowNodes(
                  flow,
                  deleted.map((node) => node.id),
                ),
              )
            }
            onEdgesDelete={(deleted) =>
              change(
                removeFlowEdges(
                  flow,
                  deleted.map((edge) => edge.id),
                ),
              )
            }
            onNodeClick={(_, node) => select({ kind: 'node', id: node.id })}
            onNodeDoubleClick={(_, node) => {
              if (node.data.node.type === 'event')
                onEditEvent(node.data.node.eventId)
            }}
            zoomOnDoubleClick={false}
            onEdgeClick={(_, edge) => select({ kind: 'edge', id: edge.id })}
            onPaneClick={() => select(null)}
            deleteKeyCode={['Backspace', 'Delete']}
            minZoom={0.15}
            fitView
          >
            <Background gap={24} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      </section>

      <aside className="panel bo-flow-detail" aria-label="รายละเอียดที่เลือก">
        {selectedNode ? (
          <NodeDetail
            node={selectedNode}
            content={content}
            pools={pools}
            eventIds={eventIds}
            issues={issues.get(selectedNode.id)}
            onChange={updateNode}
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
                flow.nodes.find((node) => node.id === selectedEdge.from)!,
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
                flow.nodes.find((node) => node.id === selectedEdge.from)!,
                content.events,
              ).find((port) => port.id === selectedEdge.port)?.label ??
                selectedEdge.port}
            </p>
            <section className="bo-editor-section">
              <h3>เงื่อนไขบนเส้น (ไม่เกิน 1 ข้อ)</h3>
              <V2ConditionList
                value={selectedEdge.condition ? [selectedEdge.condition] : []}
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
              เส้นจากทางเดียวกันตรวจตามลำดับ เส้นแรกที่เงื่อนไขผ่านจะถูกใช้
              เส้นที่ไม่มีเงื่อนไขทำหน้าที่เป็นทางสำรอง
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => change(moveEdgeOrder(flow, selectedEdge.id, -1))}
              >
                ↑ ตรวจก่อน
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => change(moveEdgeOrder(flow, selectedEdge.id, 1))}
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
        ) : (
          <p className="muted text-sm">
            เลือกการ์ดหรือเส้นเพื่อดูรายละเอียด
            ลากจากจุดขวาของตัวเลือกไปยังการ์ดถัดไปเพื่อเชื่อมเส้น
          </p>
        )}
      </aside>
    </div>
  )
}

function NodeDetail({
  node,
  content,
  pools,
  eventIds,
  issues,
  onChange,
  onRemove,
  onEditEvent,
  onPreview,
}: {
  node: V2FlowNode
  content: V2Content
  pools: string[]
  eventIds: string[]
  issues?: FlowNodeIssues
  onChange: (node: V2FlowNode) => void
  onRemove: () => void
  onEditEvent: (eventId: string) => void
  onPreview: (eventId: string) => void
}) {
  return (
    <div className="bo-stack">
      <p className="eyebrow">{typeLabels[node.type]}</p>
      <h2 className="text-lg font-extrabold">{cardTitle(node, content)}</h2>
      <p className="muted text-xs">Node ID: {node.id}</p>
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
          >
            ทดลองเหตุการณ์
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
