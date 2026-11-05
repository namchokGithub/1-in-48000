/** A card's frame on the board, in flow coordinates. */
export type CardBox = { x: number; y: number; width: number; height: number }

export type HelperLine = {
  /** x of a vertical line, or y of a horizontal line. */
  position: number
  /** Where the line starts and ends along its own direction. */
  from: number
  to: number
}

export type HelperLines = {
  /** Shift to apply to the dragged card so it lines up; 0 when not aligned. */
  offsetX: number
  offsetY: number
  vertical?: HelperLine
  horizontal?: HelperLine
}

type Axis = 'x' | 'y'

function anchors(box: CardBox, axis: Axis): number[] {
  const start = box[axis]
  const size = axis === 'x' ? box.width : box.height
  return [start, start + size / 2, start + size]
}

function closest(box: CardBox, others: CardBox[], axis: Axis, limit: number) {
  let best: { offset: number; other: CardBox; gap: number } | undefined
  const cross: Axis = axis === 'x' ? 'y' : 'x'
  const crossSize = (item: CardBox) =>
    cross === 'x' ? item.width : item.height
  for (const other of others) {
    // How far apart the two cards are across the line, to prefer near ones.
    const gap = Math.max(
      0,
      other[cross] - (box[cross] + crossSize(box)),
      box[cross] - (other[cross] + crossSize(other)),
    )
    for (const mine of anchors(box, axis))
      for (const theirs of anchors(other, axis)) {
        const offset = theirs - mine
        if (Math.abs(offset) > limit) continue
        if (
          !best ||
          Math.abs(offset) < Math.abs(best.offset) ||
          (Math.abs(offset) === Math.abs(best.offset) && gap < best.gap)
        )
          best = { offset, other, gap }
      }
  }
  return best
}

function line(
  box: CardBox,
  match: { offset: number; other: CardBox },
  axis: Axis,
): HelperLine {
  const moved = { ...box, [axis]: box[axis] + match.offset }
  const mine = anchors(moved, axis)
  const theirs = anchors(match.other, axis)
  const position = mine.find((value) => theirs.includes(value)) ?? mine[0]
  const cross: Axis = axis === 'x' ? 'y' : 'x'
  const end = (item: CardBox) =>
    item[cross] + (cross === 'x' ? item.width : item.height)
  return {
    position,
    from: Math.min(moved[cross], match.other[cross]),
    to: Math.max(end(moved), end(match.other)),
  }
}

/**
 * Finds the nearest card edge or centre that the dragged card can line up with,
 * at most `threshold` away, separately for vertical and horizontal lines. Each
 * side compares the left, centre, and right (or top, middle, and bottom) of
 * both cards.
 */
export function findHelperLines(
  box: CardBox,
  others: CardBox[],
  threshold: number,
): HelperLines {
  const x = closest(box, others, 'x', threshold)
  const y = closest(box, others, 'y', threshold)
  return {
    offsetX: x?.offset ?? 0,
    offsetY: y?.offset ?? 0,
    vertical: x ? line(box, x, 'x') : undefined,
    horizontal: y ? line(box, y, 'y') : undefined,
  }
}
