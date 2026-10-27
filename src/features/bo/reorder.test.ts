import { describe, expect, it } from 'vitest'
import { reorder } from './reorder'

describe('story card order', () => {
  it('moves a card to its new position without changing its contents', () => {
    const cards = [{ text: 'A' }, { text: 'B' }, { text: 'C' }]
    expect(reorder(cards, 0, 2)).toEqual([cards[1], cards[2], cards[0]])
    expect(cards.map((card) => card.text)).toEqual(['A', 'B', 'C'])
  })
})
