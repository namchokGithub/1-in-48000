import { describe, expect, it } from 'vitest'
import names from '../../../public/content-v2/names.json'
import assets from '../../../public/content-v2/assets.json'
import { playerPortraitPath } from './playerIdentity'

const pathOf = (id: string | undefined) =>
  assets.find((asset) => asset.id === id)?.path

describe('player portrait lookup', () => {
  it('resolves each seeded name through the portrait of the chosen outfit', () => {
    for (const name of names) {
      expect(playerPortraitPath(names, assets, name.id, 'casual')).toBe(
        pathOf(name.portraits?.casual),
      )
      expect(playerPortraitPath(names, assets, name.id, 'student')).toBe(
        pathOf(name.portraits?.student),
      )
    }
  })

  it('uses the student outfit when no outfit is given', () => {
    const name = names[0]
    expect(playerPortraitPath(names, assets, name.id)).toBe(
      pathOf(name.portraits?.student),
    )
  })

  it('does not use a missing or non-portrait asset', () => {
    expect(playerPortraitPath(names, assets, 'missing')).toBeUndefined()
    expect(
      playerPortraitPath(
        [{ id: 'other', portraits: { student: 'classroom' } }],
        assets,
        'other',
      ),
    ).toBeUndefined()
  })
})
