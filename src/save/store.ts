import { createStore } from 'zustand/vanilla'
import { choose, createGame, type GameContent } from '../engine/game'
import { loadStoredSave } from './migrations'
import type { PlayerSave } from './schema'
import type { SaveStorage } from './storage'

export type GameStore = {
  save: PlayerSave | null
  startGame(playerName: string, rngSeed: number): PlayerSave
  continueGame(): PlayerSave | null
  choose(choiceId: string): PlayerSave
  restartGame(playerName: string, rngSeed: number): PlayerSave
  exportSave(): string | null
}

export function createGameStore(content: GameContent, storage: SaveStorage) {
  return createStore<GameStore>()((set, get) => {
    const begin = (playerName: string, rngSeed: number): PlayerSave => {
      const save = createGame(content, playerName, rngSeed)
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
        const save = loadStoredSave(raw, content.config.contentVersion)
        set({ save })
        return save
      },
      choose: (choiceId) => {
        const current = get().save
        if (!current) throw new Error('No active game')
        const save = choose(content, current, choiceId)
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
