import { describe, expect, it } from 'vitest'
import names from '../../../public/content-v2/names.json'
import assets from '../../../public/content-v2/assets.json'
import {
  playerPortraitPath,
  playerProgram,
  scenePortraits,
} from './playerIdentity'

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

describe('player program label', () => {
  const faculties = [{ id: 'humanities', name: 'คณะมนุษยศาสตร์' }]
  const majors = [{ id: 'thai', name: 'ภาษาไทย' }]

  it('names the chosen faculty and major', () => {
    expect(playerProgram(faculties, majors, 'humanities', 'thai')).toBe(
      'คณะมนุษยศาสตร์ · ภาษาไทย',
    )
  })

  it('is empty before the program is chosen or when an ID is unknown', () => {
    expect(playerProgram(faculties, majors, null, null)).toBeUndefined()
    expect(playerProgram(faculties, majors, 'humanities', null)).toBeUndefined()
    expect(playerProgram(faculties, majors, 'missing', 'thai')).toBeUndefined()
  })
})

describe('scene portraits', () => {
  it('puts the speaker on the left and the player on the right', () => {
    expect(scenePortraits('/mali.png', '/fah.png', false)).toEqual({
      speaker: '/mali.png',
      player: '/fah.png',
    })
    expect(scenePortraits(undefined, '/fah.png', false)).toEqual({
      speaker: undefined,
      player: '/fah.png',
    })
  })

  it('hides the player when the event asks, and never shows one picture twice', () => {
    expect(scenePortraits('/mali.png', '/fah.png', true)).toEqual({
      speaker: '/mali.png',
      player: undefined,
    })
    expect(scenePortraits('/fah.png', '/fah.png', false)).toEqual({
      speaker: undefined,
      player: '/fah.png',
    })
  })
})
