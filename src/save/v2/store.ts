import { createStore } from 'zustand/vanilla'
import {
  chooseV2,
  chooseV2Elective,
  chooseV2Many,
  chooseV2Program,
  createV2Game,
  getV2CurrentEvent,
  type V2GameContent,
} from '../../engine/v2/game'
import type { SaveSession, SaveStorage } from '../storage'
import { v2PlayerSaveSchema, type V2PlayerSave } from './schema'

export type V2GameStore = {
  save: V2PlayerSave | null
  startGame(rngSeed: number, backgroundId?: string): V2PlayerSave
  restoreGame(): V2PlayerSave | null
  choose(choiceId: string): V2PlayerSave
  chooseMany(choiceIds: string[]): V2PlayerSave
  chooseProgram(facultyId: string, majorId: string): V2PlayerSave
  chooseElective(electiveId: string): V2PlayerSave
  restartGame(rngSeed: number, backgroundId?: string): V2PlayerSave
}

export function createV2GameStore(
  content: V2GameContent,
  storage: SaveStorage,
  session: SaveSession,
) {
  return createStore<V2GameStore>()((set, get) => {
    const checkpoint = (save: V2PlayerSave) => {
      storage.write(JSON.stringify(save))
      session.write(!save.endingId)
      set({ save })
      return save
    }
    const begin = (rngSeed: number, backgroundId?: string) =>
      checkpoint(createV2Game(content, rngSeed, backgroundId))
    const resolve = (action: (current: V2PlayerSave) => V2PlayerSave) => {
      const current = get().save
      if (!current) throw new Error('No active game')
      return checkpoint(action(current))
    }

    return {
      save: null,
      startGame: begin,
      restartGame: begin,
      restoreGame: () => {
        try {
          if (!session.read()) return null
          const raw = storage.read()
          if (!raw) {
            session.write(false)
            return null
          }
          const parsed = v2PlayerSaveSchema.safeParse(JSON.parse(raw))
          if (
            !parsed.success ||
            parsed.data.contentVersion !== content.config.contentVersion ||
            parsed.data.endingId
          ) {
            session.write(false)
            return null
          }
          const restored = parsed.data
          const major = content.majors.find(
            (item) => item.id === restored.majorId,
          )
          if (
            !getV2CurrentEvent(content, restored) ||
            !content.names.some((item) => item.id === restored.nameId) ||
            !content.config.backgrounds.some(
              (item) => item.id === restored.backgroundId,
            ) ||
            (restored.facultyId !== null &&
              !content.faculties.some(
                (item) => item.id === restored.facultyId,
              )) ||
            (restored.majorId !== null &&
              major?.facultyId !== restored.facultyId) ||
            (restored.electiveId !== null &&
              !content.electives.some(
                (item) => item.id === restored.electiveId,
              ))
          ) {
            session.write(false)
            return null
          }
          set({ save: restored })
          return restored
        } catch {
          try {
            session.write(false)
          } catch {
            /* Storage may be unavailable. */
          }
          return null
        }
      },
      choose: (choiceId) =>
        resolve((current) => chooseV2(content, current, choiceId)),
      chooseMany: (choiceIds) =>
        resolve((current) => chooseV2Many(content, current, choiceIds)),
      chooseProgram: (facultyId, majorId) =>
        resolve((current) =>
          chooseV2Program(content, current, facultyId, majorId),
        ),
      chooseElective: (electiveId) =>
        resolve((current) => chooseV2Elective(content, current, electiveId)),
    }
  })
}
