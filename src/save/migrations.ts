import { playerSaveSchema, type PlayerSave } from './schema'

export const CURRENT_SAVE_VERSION = 1

export function loadStoredSave(
  raw: string,
  expectedContentVersion: string,
): PlayerSave {
  const data: unknown = JSON.parse(raw)
  const version =
    data !== null && typeof data === 'object' && 'saveVersion' in data
      ? data.saveVersion
      : undefined

  switch (version) {
    case CURRENT_SAVE_VERSION: {
      const save = playerSaveSchema.parse(data)
      if (save.contentVersion !== expectedContentVersion) {
        throw new Error('Content version mismatch')
      }
      return save
    }
    default:
      throw new Error(`Unsupported save version: ${String(version)}`)
  }
}
