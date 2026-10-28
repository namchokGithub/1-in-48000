import { describe, expect, it } from 'vitest'
import names from '../../../public/content-v2/names.json'
import assets from '../../../public/content-v2/assets.json'
import { playerPortraitPath } from './playerIdentity'

describe('player portrait lookup', () => {
  it('resolves each seeded name through its portrait Asset ID', () => {
    for (const name of names) {
      expect(playerPortraitPath(names, assets, name.id)).toBe(
        assets.find((asset) => asset.id === name.portraitAssetId)?.path,
      )
    }
  })

  it('does not use a missing or non-portrait asset', () => {
    expect(playerPortraitPath(names, assets, 'missing')).toBeUndefined()
    expect(
      playerPortraitPath(
        [{ id: 'other', portraitAssetId: 'classroom' }],
        assets,
        'other',
      ),
    ).toBeUndefined()
  })
})
