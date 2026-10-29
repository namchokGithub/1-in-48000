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
