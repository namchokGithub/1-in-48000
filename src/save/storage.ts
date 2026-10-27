export const SAVE_STORAGE_KEY = '1-in-48000:save'

export interface SaveStorage {
  write(value: string): void
}

type BrowserStorage = Pick<Storage, 'setItem'>

export function createLocalStorageAdapter(
  browserStorage: BrowserStorage = window.localStorage,
): SaveStorage {
  return {
    write: (value) => browserStorage.setItem(SAVE_STORAGE_KEY, value),
  }
}
