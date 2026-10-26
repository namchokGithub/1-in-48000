export const SAVE_STORAGE_KEY = '1-in-48000:save'

export interface SaveStorage {
  read(): string | null
  write(value: string): void
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
