import type { GameContent } from '../engine/game'
import {
  assetListSchema,
  characterListSchema,
  endingListSchema,
  eventListSchema,
  gameConfigSchema,
  type Asset,
  type Character,
} from './schema'

export type PlayerContent = GameContent & {
  characters: Character[]
  assets: Asset[]
}

type ReadJson = (path: string) => Promise<unknown>

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Cannot load content: ${path}`)
  return response.json()
}

export async function loadPlayerContent(
  readJson: ReadJson = fetchJson,
): Promise<PlayerContent> {
  const [config, events, characters, assets, endings] = await Promise.all([
    readJson('/content/config.json'),
    readJson('/content/events.json'),
    readJson('/content/characters.json'),
    readJson('/content/assets.json'),
    readJson('/content/endings.json'),
  ])
  return {
    config: gameConfigSchema.parse(config),
    events: eventListSchema.parse(events),
    characters: characterListSchema.parse(characters),
    assets: assetListSchema.parse(assets),
    endings: endingListSchema.parse(endings),
  }
}
