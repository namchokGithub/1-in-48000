import { z } from 'zod'
import { playerSaveSchema, type PlayerSave } from './schema'

export const CURRENT_SAVE_VERSION = 2
const LEGACY_CONTENT_VERSION = '0.1.0'
const PREVIOUS_CONTENT_VERSION = '0.2.0'
const CURRENT_CONTENT_VERSION = '0.3.0'
const v1SaveSchema = playerSaveSchema
  .omit({ saveVersion: true, backgroundId: true })
  .extend({ saveVersion: z.literal(1) })

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
    case 1: {
      const oldSave = v1SaveSchema.parse(data)
      if (
        oldSave.contentVersion !== LEGACY_CONTENT_VERSION ||
        expectedContentVersion !== CURRENT_CONTENT_VERSION
      ) {
        throw new Error('Content version mismatch')
      }
      return playerSaveSchema.parse({
        ...oldSave,
        saveVersion: CURRENT_SAVE_VERSION,
        contentVersion: CURRENT_CONTENT_VERSION,
        backgroundId: null,
      })
    }
    case CURRENT_SAVE_VERSION: {
      const save = playerSaveSchema.parse(data)
      if (save.contentVersion === expectedContentVersion) return save
      if (
        save.contentVersion === PREVIOUS_CONTENT_VERSION &&
        expectedContentVersion === CURRENT_CONTENT_VERSION
      ) {
        return playerSaveSchema.parse({
          ...save,
          contentVersion: CURRENT_CONTENT_VERSION,
        })
      }
      throw new Error('Content version mismatch')
    }
    default:
      throw new Error(`Unsupported save version: ${String(version)}`)
  }
}
