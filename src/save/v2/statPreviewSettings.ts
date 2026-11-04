import { createStore } from 'zustand/vanilla'

export const PLAYER_STAT_PREVIEW_KEY = '1-in-48000:player-stat-preview'

type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Stat changes under choices are shown unless the player turned them off. */
export function readStatPreview(raw: string | null): boolean {
  return raw !== 'hide'
}

export function createStatPreviewStore(
  storage: SettingsStorage = window.localStorage,
) {
  let initial: boolean
  try {
    initial = readStatPreview(storage.getItem(PLAYER_STAT_PREVIEW_KEY))
  } catch {
    initial = true
  }

  return createStore<{
    showStatChanges: boolean
    setShowStatChanges: (show: boolean) => void
  }>((set) => ({
    showStatChanges: initial,
    setShowStatChanges: (show) => {
      set({ showStatChanges: show })
      try {
        storage.setItem(PLAYER_STAT_PREVIEW_KEY, show ? 'show' : 'hide')
      } catch {
        // The choice still applies for this session.
      }
    },
  }))
}
