import { describe, expect, it } from 'vitest'
import { findHelperLines, type CardBox } from './helperLines'

const card = (x: number, y: number, width = 240, height = 120): CardBox => ({
  x,
  y,
  width,
  height,
})

describe('Story Flow helper lines', () => {
  it('lines up the left edges of cards within the threshold', () => {
    const lines = findHelperLines(card(105, 400), [card(100, 0)], 8)
    expect(lines.offsetX).toBe(-5)
    expect(lines.vertical).toEqual({ position: 100, from: 0, to: 520 })
    expect(lines.horizontal).toBeUndefined()
    expect(lines.offsetY).toBe(0)
  })

  it('lines up centres and opposite edges, horizontally and vertically', () => {
    // Centre of a taller card next to a shorter one: middles 60 and 66.
    const centred = findHelperLines(card(400, 6), [card(0, 0)], 8)
    expect(centred.offsetY).toBe(-6)
    expect(centred.horizontal).toMatchObject({ position: 0, from: 0, to: 640 })

    // Right edge of one card against the left edge of another.
    const touching = findHelperLines(card(243, 300), [card(0, 0)], 8)
    expect(touching.offsetX).toBe(-3)
    expect(touching.vertical?.position).toBe(240)
  })

  it('ignores cards farther than the threshold', () => {
    expect(findHelperLines(card(130, 300), [card(0, 0)], 8)).toEqual({
      offsetX: 0,
      offsetY: 0,
      vertical: undefined,
      horizontal: undefined,
    })
  })

  it('prefers the closest match, then the nearer card', () => {
    const lines = findHelperLines(
      card(103, 500),
      [card(100, 0), card(102, 2000), card(101, 900)],
      8,
    )
    expect(lines.offsetX).toBe(-1)
    expect(lines.vertical?.position).toBe(102)

    const tie = findHelperLines(
      card(102, 500),
      [card(100, 3000), card(100, 200)],
      8,
    )
    expect(tie.vertical).toEqual({ position: 100, from: 200, to: 620 })
  })
})
