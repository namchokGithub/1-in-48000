import { describe, expect, it } from 'vitest'
import { lineSpeaker } from './lineSpeaker'

const mali = { id: 'mali', name: 'มะลิ', portraitAssetId: 'mali_private' }
const narrator = {
  id: 'narrator',
  name: 'ผู้บรรยาย',
  portraitAssetId: 'narrator_portrait',
  isNarrator: true,
}

describe('line speaker', () => {
  it('uses the line speaker when one is set', () => {
    expect(lineSpeaker({ speakerId: 'mali' }, [mali, narrator])).toBe(mali)
  })

  it('uses the narrator for a line without a speaker', () => {
    expect(lineSpeaker({}, [mali, narrator])).toBe(narrator)
  })

  it('has no speaker when no narrator is set or the speaker is unknown', () => {
    expect(lineSpeaker({}, [mali])).toBeUndefined()
    expect(lineSpeaker({ speakerId: 'missing' }, [narrator])).toBeUndefined()
  })
})
