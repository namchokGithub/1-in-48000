import { describe, expect, it } from 'vitest'
import config from '../../public/content/config.json'
import events from '../../public/content/events.json'
import characters from '../../public/content/characters.json'
import assets from '../../public/content/assets.json'
import endings from '../../public/content/endings.json'
import { loadPlayerContent } from './loader'

const files: Record<string, unknown> = {
  '/content/config.json': config,
  '/content/events.json': events,
  '/content/characters.json': characters,
  '/content/assets.json': assets,
  '/content/endings.json': endings,
}

describe('Player content loader', () => {
  it('loads and validates all five content files', async () => {
    const requested: string[] = []
    const loaded = await loadPlayerContent(async (path) => {
      requested.push(path)
      return files[path]
    })

    expect(requested).toEqual(Object.keys(files))
    expect(loaded.config.startingEventId).toBe('orientation')
    expect(loaded.events[0].id).toBe('orientation')
    expect(loaded.characters[0].id).toBe('mali')
  })

  it('rejects invalid content before the game starts', async () => {
    await expect(
      loadPlayerContent(async (path) =>
        path === '/content/config.json'
          ? { ...config, backgrounds: [] }
          : files[path],
      ),
    ).rejects.toThrow()
  })
})
