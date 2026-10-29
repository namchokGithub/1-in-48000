import type { V2Content } from '../../content/v2/schema'
import type { V2FlowStep } from '../../engine/v2/game'
import { formatGameTime } from '../player/labels'
import { conditionSummary } from './storySummary'

export type TraceLine = { text: string; detail?: string; passed?: boolean }

function nodeName(content: V2Content, nodeId: string): string {
  const node = content.flow.nodes.find((item) => item.id === nodeId)
  if (node?.type === 'event')
    return (
      content.events.find((event) => event.id === node.eventId)?.title ??
      node.eventId
    )
  if (node?.type === 'ending')
    return (
      content.endings.find((ending) => ending.id === node.endingId)?.title ??
      node.endingId
    )
  return nodeId
}

const reviewLabels = {
  graduate: 'ผ่านเกณฑ์ → จบการศึกษา',
  extend: 'ไม่ผ่านเกณฑ์ → เรียนต่อ',
  dismiss: 'ไม่ผ่านเกณฑ์ปี 8 → พ้นสภาพ',
}

export function describeFlowStep(
  step: V2FlowStep,
  content: V2Content,
): TraceLine {
  switch (step.type) {
    case 'edge': {
      const skipped = step.checked.filter((item) => !item.passed)
      const used = step.checked.at(-1)
      return {
        text: `${nodeName(content, step.from)} → ${nodeName(content, step.to)}`,
        detail: [
          ...skipped.map(
            (item) =>
              `ข้ามเส้น: ${item.condition ? conditionSummary(item.condition) : ''} ไม่ผ่าน`,
          ),
          used?.condition
            ? `ใช้เส้น: ${conditionSummary(used.condition)} ผ่าน`
            : skipped.length
              ? 'ใช้เส้นที่ไม่มีเงื่อนไข'
              : undefined,
        ]
          .filter(Boolean)
          .join(' · '),
        passed: true,
      }
    }
    case 'condition':
      return {
        text: `Condition ${step.nodeId}: ${step.passed ? 'ผ่าน' : 'ไม่ผ่าน'} (${step.join === 'and' ? 'ทุกข้อ' : 'อย่างน้อยหนึ่งข้อ'})`,
        detail: step.results
          .map(
            (result) =>
              `${result.passed ? '✓' : '✗'} ${conditionSummary(result.condition)}`,
          )
          .join(' · '),
        passed: step.passed,
      }
    case 'random':
      return {
        text: step.eventId
          ? `สุ่มจาก Pool ${step.poolId}: ได้ ${content.events.find((event) => event.id === step.eventId)?.title ?? step.eventId}`
          : `Pool ${step.poolId} ไม่มีเหตุการณ์ที่มีสิทธิ์ → ทางสำรอง`,
        detail: step.candidates.length
          ? `มีสิทธิ์ ${step.candidates.length} เหตุการณ์: ${step.candidates.join(', ')}`
          : undefined,
        passed: step.eventId !== null,
      }
    case 'nextPeriod':
      return {
        text: step.review
          ? `ตรวจผลการเรียน ${formatGameTime(step.from)}: ${reviewLabels[step.review]}`
          : `เลื่อนเวลา ${formatGameTime(step.from)} → ${formatGameTime(step.to)}`,
        detail:
          step.score === null
            ? undefined
            : `คะแนน = การเรียน − ความเครียด ÷ 10 = ${Math.round(step.score * 10) / 10} (ต้องได้อย่างน้อย 60)`,
        passed: step.review ? step.review === 'graduate' : undefined,
      }
    case 'event':
      return { text: `ถึงเหตุการณ์: ${nodeName(content, step.nodeId)}` }
    case 'ending':
      return {
        text: `ถึงตอนจบ: ${content.endings.find((ending) => ending.id === step.endingId)?.title ?? step.endingId}`,
      }
  }
}

export function tracedPath(steps: V2FlowStep[], startNodeId: string | null) {
  const nodeIds = new Set<string>(startNodeId ? [startNodeId] : [])
  const edgeIds = new Set<string>()
  for (const step of steps) {
    if (step.type === 'edge') {
      edgeIds.add(step.edgeId)
      nodeIds.add(step.from)
      nodeIds.add(step.to)
    } else if (step.nodeId) {
      nodeIds.add(step.nodeId)
    }
  }
  return { nodeIds: [...nodeIds], edgeIds: [...edgeIds] }
}

export function previewErrorMessage(
  message: string,
  content: V2Content,
): string {
  const noPath = message.match(/^No path from (\S+) \((.+)\)$/)
  if (!noPath) return message
  const [, nodeId, port] = noPath
  if (nodeId === 'bo_preview_event')
    return 'เหตุการณ์นี้ยังไม่ได้วางบนกระดาน Flow จึงไปต่อไม่ได้ วางการ์ดและลากเส้นจากตัวเลือกก่อนทดลองต่อ'
  return `การ์ด “${nodeName(content, nodeId)}” ยังไม่มีเส้นที่ใช้ได้จากทาง “${port}” ลากเส้นหรือเพิ่มเส้นที่ไม่มีเงื่อนไขในแท็บ Flow เรื่อง`
}
