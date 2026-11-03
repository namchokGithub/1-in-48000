import { describe, expect, it } from 'vitest'
import {
  bottomHandleId,
  floatingTarget,
  outputSide,
  portFromHandle,
  routePath,
} from './flowEdgeGeometry'

const card = { x: 0, y: 0, width: 240, height: 160 }

describe('BO flow edge geometry', () => {
  it('leaves from the bottom only when the target sits mostly below', () => {
    expect(outputSide(card, { ...card, x: 320 })).toBe('right')
    expect(outputSide(card, { ...card, y: 200 })).toBe('bottom')
    expect(outputSide(card, { ...card, x: 300, y: 400 })).toBe('bottom')
    expect(outputSide(card, { ...card, x: 600, y: 200 })).toBe('right')
    expect(outputSide(card, { ...card, x: -400, y: -300 })).toBe('right')
  })

  it('enters the target where the line from the source meets its border', () => {
    const target = { x: 400, y: 0, width: 240, height: 160 }
    expect(floatingTarget(target, { x: 0, y: 80 })).toEqual({
      x: 400,
      y: 80,
      side: 'left',
    })
    expect(floatingTarget(target, { x: 520, y: -200 })).toEqual({
      x: 520,
      y: 0,
      side: 'top',
    })
    expect(floatingTarget(target, { x: 520, y: 400 })).toMatchObject({
      y: 160,
      side: 'bottom',
    })
  })

  it('maps bottom handles back to their port', () => {
    expect(portFromHandle(bottomHandleId('apply_kyos'))).toBe('apply_kyos')
    expect(portFromHandle('apply_kyos')).toBe('apply_kyos')
  })

  it('draws a route with rounded corners and labels it halfway along', () => {
    expect(
      routePath([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
    ).toEqual({ path: 'M 0 0 L 100 0', labelX: 50, labelY: 0 })

    const corner = routePath([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 60 },
    ])
    expect(corner.path).toBe('M 0 0 L 32 0 Q 40 0 40 8 L 40 60')
    expect([corner.labelX, corner.labelY]).toEqual([40, 10])

    const tight = routePath([
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 60 },
    ])
    expect(tight.path).toBe('M 0 0 L 3 0 Q 6 0 6 3 L 6 60')
  })
})
