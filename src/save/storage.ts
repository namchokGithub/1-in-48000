export const SAVE_STORAGE_KEY = '1-in-48000:save'
export const SAVE_SESSION_KEY = '1-in-48000:active-tab'

export interface SaveStorage {
  read(): string | null
  write(value: string): void
}

export interface SaveSession {
  read(): boolean
  write(active: boolean): void
}

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem'>

export function createLocalStorageAdapter(
  browserStorage: BrowserStorage = window.localStorage,
): SaveStorage {
  return {
    read: () => browserStorage.getItem(SAVE_STORAGE_KEY),
    write: (value) => browserStorage.setItem(SAVE_STORAGE_KEY, value),
  }
}

export function createSessionStorageAdapter(
  browserStorage: BrowserStorage = window.sessionStorage,
): SaveSession {
  return {
    read: () => browserStorage.getItem(SAVE_SESSION_KEY) === 'active',
    write: (active) =>
      browserStorage.setItem(SAVE_SESSION_KEY, active ? 'active' : 'finished'),
  }
}
