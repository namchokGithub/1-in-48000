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

/** One space between two cards, drawn as a double arrow with its size. */
export type SpacingGap = {
  axis: Axis
  /** Start and end of the space along `axis`. */
  from: number
  to: number
  /** Where to draw it across the axis: the middle of the two cards' overlap. */
  at: number
}

export type SpacingGuide = { offset: number; gaps: SpacingGap[] }

const size = (box: CardBox, axis: Axis) =>
  axis === 'x' ? box.width : box.height
const end = (box: CardBox, axis: Axis) => box[axis] + size(box, axis)
const other = (axis: Axis): Axis => (axis === 'x' ? 'y' : 'x')

/** True when two cards share a row (for `x`) or a column (for `y`). */
function sideBySide(a: CardBox, b: CardBox, axis: Axis) {
  const cross = other(axis)
  return a[cross] < end(b, cross) && b[cross] < end(a, cross)
}

function gap(a: CardBox, b: CardBox, axis: Axis): SpacingGap {
  const cross = other(axis)
  const top = Math.max(a[cross], b[cross])
  const bottom = Math.min(end(a, cross), end(b, cross))
  return { axis, from: end(a, axis), to: b[axis], at: (top + bottom) / 2 }
}

/** The nearest card in the same row or column before (-1) or after (1) `box`. */
function neighbour(box: CardBox, cards: CardBox[], axis: Axis, side: -1 | 1) {
  let best: CardBox | undefined
  for (const card of cards) {
    if (card === box || !sideBySide(box, card, axis)) continue
    if (side < 0 ? end(card, axis) > box[axis] : card[axis] < end(box, axis))
      continue
    if (
      !best ||
      (side < 0 ? end(card, axis) > end(best, axis) : card[axis] < best[axis])
    )
      best = card
  }
  return best
}

function spacingOn(
  box: CardBox,
  others: CardBox[],
  axis: Axis,
  limit: number,
): SpacingGuide | undefined {
  const middle = box[axis] + size(box, axis) / 2
  const row = others.filter((card) => sideBySide(box, card, axis))
  // Nearest neighbours by centre, so a card overlapping the box still counts.
  const before = row
    .filter((card) => card[axis] + size(card, axis) / 2 < middle)
    .sort((a, b) => end(b, axis) - end(a, axis))[0]
  const after = row
    .filter((card) => card[axis] + size(card, axis) / 2 >= middle)
    .sort((a, b) => a[axis] - b[axis])[0]
  const options: { start: number; gaps: (moved: CardBox) => SpacingGap[] }[] =
    []
  if (before) {
    const outer = neighbour(before, others, axis, -1)
    if (outer && before[axis] > end(outer, axis)) {
      const space = before[axis] - end(outer, axis)
      options.push({
        start: end(before, axis) + space,
        gaps: (moved) => [gap(outer, before, axis), gap(before, moved, axis)],
      })
    }
  }
  if (after) {
    const outer = neighbour(after, others, axis, 1)
    if (outer && outer[axis] > end(after, axis)) {
      const space = outer[axis] - end(after, axis)
      options.push({
        start: after[axis] - space - size(box, axis),
        gaps: (moved) => [gap(moved, after, axis), gap(after, outer, axis)],
      })
    }
  }
  if (before && after && after[axis] - end(before, axis) > size(box, axis))
    options.push({
      start: (end(before, axis) + after[axis] - size(box, axis)) / 2,
      gaps: (moved) => [gap(before, moved, axis), gap(moved, after, axis)],
    })
  let best: SpacingGuide | undefined
  for (const option of options) {
    const offset = option.start - box[axis]
    if (Math.abs(offset) > limit) continue
    if (best && Math.abs(best.offset) <= Math.abs(offset)) continue
    best = { offset, gaps: option.gaps({ ...box, [axis]: option.start }) }
  }
  return best
}

/**
 * Finds a spot where the dragged card leaves the same space as its neighbours,
 * at most `threshold` away: after the last space in its row or column, before
 * the first, or centred between two cards. `x` spaces cards side by side, `y`
 * stacks them.
 */
export function findSpacingGuides(
  box: CardBox,
  others: CardBox[],
  threshold: number,
): { x?: SpacingGuide; y?: SpacingGuide } {
  return {
    x: spacingOn(box, others, 'x', threshold),
    y: spacingOn(box, others, 'y', threshold),
  }
}
