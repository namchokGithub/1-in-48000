import { z } from 'zod'
import {
  assetListSchema,
  characterListSchema,
  endingListSchema,
  eventListSchema,
  gameConfigSchema,
  type Asset,
  type Condition,
} from './schema.ts'

export type ValidationIssue = { path: string; message: string }

export const completeContentSchema = z.object({
  config: gameConfigSchema,
  events: eventListSchema,
  characters: characterListSchema,
  assets: assetListSchema,
  endings: endingListSchema,
})

export function validateContent(input: unknown): ValidationIssue[] {
  const parsed = completeContentSchema.safeParse(input)
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
  }

  const { config, events, characters, assets, endings } = parsed.data
  const issues: ValidationIssue[] = []
  const report = (path: string, message: string) =>
    issues.push({ path, message })

  function checkDuplicates(items: { id: string }[], path: string) {
    const seen = new Set<string>()
    items.forEach((item, index) => {
      if (seen.has(item.id)) report(`${path}.${index}.id`, `ID ซ้ำ: ${item.id}`)
      seen.add(item.id)
    })
  }

  checkDuplicates(events, 'events')
  checkDuplicates(endings, 'endings')
  checkDuplicates(assets, 'assets')
  checkDuplicates(characters, 'characters')
  checkDuplicates(config.backgrounds, 'config.backgrounds')
  if (endings.length === 0) report('endings', 'ต้องมีตอนจบอย่างน้อยหนึ่งรายการ')

  const eventIds = new Set(events.map((event) => event.id))
  const characterIds = new Set(characters.map((character) => character.id))
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]))
  const checkEvent = (id: string, path: string) => {
    if (!eventIds.has(id)) report(path, `ไม่พบเหตุการณ์: ${id}`)
  }
  const checkAsset = (
    id: string | undefined,
    kind: Asset['kind'],
    path: string,
  ) => {
    if (id && assetsById.get(id)?.kind !== kind) {
      report(path, `ไม่พบ Asset ID ชนิด ${kind}: ${id}`)
    }
  }
  const checkConditions = (conditions: Condition[], path: string) => {
    conditions.forEach((condition, index) => {
      if (condition.type === 'pastEvent') {
        checkEvent(condition.eventId, `${path}.${index}.eventId`)
      }
    })
  }

  checkEvent(config.startingEventId, 'config.startingEventId')
  characters.forEach((character, index) => {
    checkAsset(
      character.portraitAssetId,
      'portrait',
      `characters.${index}.portraitAssetId`,
    )
  })
  events.forEach((event, eventIndex) => {
    const base = `events.${eventIndex}`
    checkAsset(event.sceneAssetId, 'scene', `${base}.sceneAssetId`)
    checkAsset(event.bgmAssetId, 'bgm', `${base}.bgmAssetId`)
    checkAsset(event.ambienceAssetId, 'ambience', `${base}.ambienceAssetId`)
    checkConditions(event.conditions, `${base}.conditions`)
    event.lines.forEach((line, lineIndex) => {
      const lineBase = `${base}.lines.${lineIndex}`
      if (line.speakerId && !characterIds.has(line.speakerId)) {
        report(`${lineBase}.speakerId`, `ไม่พบตัวละคร: ${line.speakerId}`)
      }
      checkAsset(
        line.portraitAssetId,
        'portrait',
        `${lineBase}.portraitAssetId`,
      )
    })
    checkDuplicates(event.choices, `${base}.choices`)
    event.choices.forEach((choice, choiceIndex) => {
      const choiceBase = `${base}.choices.${choiceIndex}`
      checkConditions(choice.conditions, `${choiceBase}.conditions`)
      choice.effects.forEach((effect, effectIndex) => {
        const effectBase = `${choiceBase}.effects.${effectIndex}`
        if (effect.type === 'goToEvent') {
          checkEvent(effect.eventId, `${effectBase}.eventId`)
        } else if (
          effect.type === 'schedule' &&
          effect.trigger.type === 'afterEvent'
        ) {
          checkEvent(effect.trigger.eventId, `${effectBase}.trigger.eventId`)
        }
      })
    })
  })
  endings.forEach((ending, index) => {
    checkConditions(ending.conditions, `endings.${index}.conditions`)
  })
  return issues
}
