import { createStore } from 'zustand/vanilla'
import {
  chooseV2,
  createV2Game,
  type V2GameContent,
} from '../../engine/v2/game'
import type { SaveStorage } from '../storage'
import { loadV2Save } from './migrations'
import type { V2PlayerSave } from './schema'

export type V2GameStore = {
  save: V2PlayerSave | null
  startGame(
    playerName: string,
    rngSeed: number,
    backgroundId?: string,
  ): V2PlayerSave
  continueGame(): V2PlayerSave | null
  choose(choiceId: string): V2PlayerSave
  restartGame(
    playerName: string,
    rngSeed: number,
    backgroundId?: string,
  ): V2PlayerSave
  exportSave(): string | null
}

export function createV2GameStore(
  content: V2GameContent,
  storage: SaveStorage,
) {
  return createStore<V2GameStore>()((set, get) => {
    const begin = (
      playerName: string,
      rngSeed: number,
      backgroundId?: string,
    ) => {
      const save = createV2Game(content, playerName, rngSeed, backgroundId)
      storage.write(JSON.stringify(save))
      set({ save })
      return save
    }

    return {
      save: null,
      startGame: begin,
      restartGame: begin,
      continueGame: () => {
        const raw = storage.read()
        if (raw === null) {
          set({ save: null })
          return null
        }
        const save = loadV2Save(raw, content.config.contentVersion)
        set({ save })
        return save
      },
      choose: (choiceId) => {
        const current = get().save
        if (!current) throw new Error('No active game')
        const save = chooseV2(content, current, choiceId)
        storage.write(JSON.stringify(save))
        set({ save })
        return save
      },
      exportSave: () => {
        const save = get().save
        return save ? JSON.stringify(save, null, 2) : storage.read()
      },
    }
  })
}
