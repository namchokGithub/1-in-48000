import { describe, expect, it } from 'vitest'
import {
  createStatPreviewStore,
  PLAYER_STAT_PREVIEW_KEY,
  readStatPreview,
} from './statPreviewSettings'

describe('Player stat preview setting', () => {
  it('shows stat changes unless the player chose to hide them', () => {
    expect(readStatPreview(null)).toBe(true)
    expect(readStatPreview('unknown')).toBe(true)
    expect(readStatPreview('hide')).toBe(false)
  })

  it('loads and persists the choice', () => {
    const saved = new Map<string, string>([[PLAYER_STAT_PREVIEW_KEY, 'hide']])
    const store = createStatPreviewStore({
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value)
      },
    })
    expect(store.getState().showStatChanges).toBe(false)
    store.getState().setShowStatChanges(true)
    expect(store.getState().showStatChanges).toBe(true)
    expect(saved.get(PLAYER_STAT_PREVIEW_KEY)).toBe('show')
  })

  it('still works when storage is blocked', () => {
    const store = createStatPreviewStore({
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(store.getState().showStatChanges).toBe(true)
    store.getState().setShowStatChanges(false)
    expect(store.getState().showStatChanges).toBe(false)
  })
})
