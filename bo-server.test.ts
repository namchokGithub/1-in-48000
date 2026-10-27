import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import config from './public/content/config.json'
import events from './public/content/events.json'
import characters from './public/content/characters.json'
import assets from './public/content/assets.json'
import endings from './public/content/endings.json'
import type { Event } from './src/content/schema'
import { loadPlayerContent } from './src/content/loader'
import { choose, createGame } from './src/engine/game'
import { saveBoContent, BoValidationError } from './bo-server'

let root = ''

async function fixture() {
  root = await mkdtemp(join(tmpdir(), 'bo-content-'))
  const dir = join(root, 'public', 'content')
  await mkdir(dir, { recursive: true })
  for (const [name, data] of Object.entries({
    config,
    events,
    characters,
    assets,
    endings,
  })) {
    await writeFile(join(dir, `${name}.json`), JSON.stringify(data))
  }
  for (const asset of assets) {
    const file = join(root, 'public', asset.path.slice(1))
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, '')
  }
  return dir
}

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true })
  root = ''
})

describe('local BO file saving', () => {
  it('writes a valid event edit to the content file', async () => {
    const dir = await fixture()
    const next = structuredClone(events)
    next[0].title = 'วันปฐมนิเทศฉบับแก้ไข'
    await saveBoContent(root, 'events', next)
    const stored = JSON.parse(await readFile(join(dir, 'events.json'), 'utf8'))
    expect(stored[0].title).toBe('วันปฐมนิเทศฉบับแก้ไข')
  })

  it('writes a valid ending edit to the content file', async () => {
    const dir = await fixture()
    const next = structuredClone(endings)
    next[0].title = 'เรื่องราวที่แก้ใน BO'
    await saveBoContent(root, 'endings', next)
    const stored = JSON.parse(await readFile(join(dir, 'endings.json'), 'utf8'))
    expect(stored[0].title).toBe('เรื่องราวที่แก้ใน BO')
  })

  it('writes speaker and sound edits to their own files', async () => {
    const dir = await fixture()
    const nextCharacters = [...characters, { id: 'new_speaker', name: 'ดาว' }]
    await saveBoContent(root, 'characters', nextCharacters)
    const soundPath = '/assets/sound/new-sfx.mp3'
    const soundFile = join(root, 'public', soundPath.slice(1))
    await mkdir(dirname(soundFile), { recursive: true })
    await writeFile(soundFile, '')
    const nextAssets = [
      ...assets,
      { id: 'new_sfx', kind: 'sfx', path: soundPath },
    ]
    await saveBoContent(root, 'assets', nextAssets)
    expect(
      JSON.parse(await readFile(join(dir, 'characters.json'), 'utf8')),
    ).toContainEqual({ id: 'new_speaker', name: 'ดาว' })
    expect(
      JSON.parse(await readFile(join(dir, 'assets.json'), 'utf8')),
    ).toContainEqual({ id: 'new_sfx', kind: 'sfx', path: soundPath })
  })

  it('adds and removes an unreferenced scene through the asset file', async () => {
    const dir = await fixture()
    const scenePath = '/assets/scene/new-scene.png'
    const sceneFile = join(root, 'public', scenePath.slice(1))
    await mkdir(dirname(sceneFile), { recursive: true })
    await writeFile(sceneFile, '')
    const extra = { id: 'new_scene', kind: 'scene', path: scenePath }
    await saveBoContent(root, 'assets', [...assets, extra])
    expect(
      JSON.parse(await readFile(join(dir, 'assets.json'), 'utf8')),
    ).toContainEqual(extra)
    await saveBoContent(root, 'assets', assets)
    expect(
      JSON.parse(await readFile(join(dir, 'assets.json'), 'utf8')),
    ).not.toContainEqual(extra)
  })

  it('rejects removing a speaker or scene still used by an event', async () => {
    const dir = await fixture()
    const beforeCharacters = await readFile(
      join(dir, 'characters.json'),
      'utf8',
    )
    const beforeAssets = await readFile(join(dir, 'assets.json'), 'utf8')
    await expect(saveBoContent(root, 'characters', [])).rejects.toBeInstanceOf(
      BoValidationError,
    )
    await expect(
      saveBoContent(
        root,
        'assets',
        assets.filter((asset) => asset.id !== 'campus_orientation'),
      ),
    ).rejects.toBeInstanceOf(BoValidationError)
    expect(await readFile(join(dir, 'characters.json'), 'utf8')).toBe(
      beforeCharacters,
    )
    expect(await readFile(join(dir, 'assets.json'), 'utf8')).toBe(beforeAssets)
  })

  it('rejects broken links and leaves the original file intact', async () => {
    const dir = await fixture()
    const before = await readFile(join(dir, 'events.json'), 'utf8')
    const next = structuredClone(events)
    next[0].sceneAssetId = 'missing_scene'
    await expect(saveBoContent(root, 'events', next)).rejects.toBeInstanceOf(
      BoValidationError,
    )
    expect(await readFile(join(dir, 'events.json'), 'utf8')).toBe(before)
  })

  it('rejects manifest paths with no file on disk', async () => {
    await fixture()
    await rm(join(root, 'public', assets[0].path.slice(1)))
    await expect(
      saveBoContent(root, 'endings', endings),
    ).rejects.toBeInstanceOf(BoValidationError)
  })

  it('makes a newly authored event playable through the Player loader and engine', async () => {
    const dir = await fixture()
    const next = structuredClone(events) as unknown as Event[]
    next.push({
      id: 'bo_new_event',
      kind: 'main',
      time: { year: 1, period: 'term1' },
      title: 'เหตุการณ์จาก BO',
      conditions: [],
      lines: [{ text: 'เรื่องใหม่' }],
      choices: [{ id: 'continue', text: 'ต่อไป', conditions: [], effects: [] }],
    })
    next[0].choices[0].effects.push({
      type: 'goToEvent',
      eventId: 'bo_new_event',
    })
    await saveBoContent(root, 'events', next)
    const loaded = await loadPlayerContent(async (path) =>
      JSON.parse(
        await readFile(join(dir, path.split('/').at(-1) ?? ''), 'utf8'),
      ),
    )
    const after = choose(loaded, createGame(loaded, 'ฟ้า', 1), 'join_group')
    expect(after.currentEventId).toBe('bo_new_event')
  })
})
