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
  const place = (
    speaker: string | undefined,
    player: string | undefined,
    options: { hidePlayer?: boolean; narrator?: boolean } = {},
  ) =>
    scenePortraits({
      speakerPath: speaker,
      speakerIsNarrator: options.narrator ?? false,
      playerPath: player,
      hidePlayer: options.hidePlayer ?? false,
    })

  it('puts the speaker on the left and the player on the right', () => {
    expect(place('/mali.png', '/fah.png')).toEqual({
      speaker: '/mali.png',
      narrator: undefined,
      player: '/fah.png',
    })
    expect(place(undefined, '/fah.png')).toEqual({
      speaker: undefined,
      narrator: undefined,
      player: '/fah.png',
    })
  })

  it('moves the narrator beside the dialogue box', () => {
    expect(place('/monkey.png', '/fah.png', { narrator: true })).toEqual({
      speaker: undefined,
      narrator: '/monkey.png',
      player: '/fah.png',
    })
  })

  it('hides the player when the event asks, and never shows one picture twice', () => {
    expect(place('/mali.png', '/fah.png', { hidePlayer: true })).toEqual({
      speaker: '/mali.png',
      narrator: undefined,
      player: undefined,
    })
    expect(place('/fah.png', '/fah.png')).toEqual({
      speaker: undefined,
      narrator: undefined,
      player: '/fah.png',
    })
  })
})
