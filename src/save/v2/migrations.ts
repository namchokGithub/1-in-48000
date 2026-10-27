import { loadStoredSave } from '../migrations'
import { v2PlayerSaveSchema, type V2PlayerSave } from './schema'

export function loadV2Save(
  raw: string,
  expectedContentVersion: string,
): V2PlayerSave {
  const data: unknown = JSON.parse(raw)
  const version =
    data !== null && typeof data === 'object' && 'saveVersion' in data
      ? data.saveVersion
      : undefined

  if (version === 3) {
    const save = v2PlayerSaveSchema.parse(data)
    if (save.contentVersion !== expectedContentVersion) {
      throw new Error('Content version mismatch')
    }
    return save
  }
  if (version === 2) {
    const old = loadStoredSave(raw, '0.4.0')
    return v2PlayerSaveSchema.parse({
      ...old,
      saveVersion: 3,
      contentVersion: expectedContentVersion,
      stats: { ...old.stats, debt: 0, lucky: 0 },
      history: old.history.map((entry) => ({
        ...entry,
        time: null,
        chanceOutcomes: [],
      })),
    })
  }
  throw new Error(`Unsupported save version: ${String(version)}`)
}
