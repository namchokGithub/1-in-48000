export type Box = { x: number; y: number; width: number; height: number }
export type Side = 'top' | 'right' | 'bottom' | 'left'

const BOTTOM_SUFFIX = '@bottom'

export function bottomHandleId(port: string): string {
  return `${port}${BOTTOM_SUFFIX}`
}

export function portFromHandle(handleId: string): string {
  return handleId.endsWith(BOTTOM_SUFFIX)
    ? handleId.slice(0, -BOTTOM_SUFFIX.length)
    : handleId
}

export function outputSide(source: Box, target: Box): 'right' | 'bottom' {
  const gapRight = target.x - (source.x + source.width)
  const gapBelow = target.y - (source.y + source.height)
  return gapBelow >= 0 && gapBelow > gapRight ? 'bottom' : 'right'
}

export function floatingTarget(
  target: Box,
  from: { x: number; y: number },
): { x: number; y: number; side: Side } {
  const centerX = target.x + target.width / 2
  const centerY = target.y + target.height / 2
  const dx = from.x - centerX
  const dy = from.y - centerY
  if (!dx && !dy) return { x: target.x, y: centerY, side: 'left' }
  const scale = Math.min(
    dx ? target.width / 2 / Math.abs(dx) : Infinity,
    dy ? target.height / 2 / Math.abs(dy) : Infinity,
  )
  const horizontal = Math.abs(dx) * target.height >= Math.abs(dy) * target.width
  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
    side: horizontal ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'top' : 'bottom',
  }
}

type Point = { x: number; y: number }

/**
 * SVG path through route points with rounded corners, and the point halfway
 * along the line for the label.
 */
export function routePath(
  points: Point[],
  radius = 8,
): { path: string; labelX: number; labelY: number } {
  const [first, ...rest] = points
  let path = `M ${first.x} ${first.y}`
  rest.forEach((point, index) => {
    const next = rest[index + 1]
    if (!next) {
      path += ` L ${point.x} ${point.y}`
      return
    }
    const previous = points[index]
    const before = Math.hypot(point.x - previous.x, point.y - previous.y)
    const after = Math.hypot(next.x - point.x, next.y - point.y)
    const bend = Math.min(radius, before / 2, after / 2)
    if (!bend) {
      path += ` L ${point.x} ${point.y}`
      return
    }
    const enter = {
      x: point.x - ((point.x - previous.x) / before) * bend,
      y: point.y - ((point.y - previous.y) / before) * bend,
    }
    const leave = {
      x: point.x + ((next.x - point.x) / after) * bend,
      y: point.y + ((next.y - point.y) / after) * bend,
    }
    path += ` L ${enter.x} ${enter.y} Q ${point.x} ${point.y} ${leave.x} ${leave.y}`
  })

  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point.x - points[index].x, point.y - points[index].y),
    )
  let left = lengths.reduce((sum, length) => sum + length, 0) / 2
  for (const [index, length] of lengths.entries()) {
    if (left <= length && length > 0) {
      const from = points[index]
      const to = points[index + 1]
      return {
        path,
        labelX: from.x + ((to.x - from.x) * left) / length,
        labelY: from.y + ((to.y - from.y) * left) / length,
      }
    }
    left -= length
  }
  return { path, labelX: first.x, labelY: first.y }
}
