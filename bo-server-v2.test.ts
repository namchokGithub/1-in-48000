import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { saveBoV2Content, BoValidationError } from './bo-server'
import { loadV2Content } from './src/content/v2/loader'
import { chooseV2, createV2Game } from './src/engine/v2/game'
import type { V2Event } from './src/content/v2/schema'

let root = ''

async function fixture() {
  root = await mkdtemp(join(tmpdir(), 'bo-v2-'))
  const dir = join(root, 'public', 'content-v2')
  await mkdir(dir, { recursive: true })
  for (const name of [
    'config',
    'events',
    'characters',
    'assets',
    'endings',
    'names',
  ]) {
    await writeFile(
      join(dir, `${name}.json`),
      await readFile(join('public', 'content-v2', `${name}.json`)),
    )
  }
  const assets = JSON.parse(
    await readFile(join(dir, 'assets.json'), 'utf8'),
  ) as Array<{ path: string }>
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

describe('V2 BO story writing', () => {
  it('saves a chance choice that resolves in the V2 Player engine', async () => {
    const dir = await fixture()
    const events = JSON.parse(
      await readFile(join(dir, 'events.json'), 'utf8'),
    ) as V2Event[]
    events[0].choices[0].effects = [
      {
        type: 'chance',
        successPercent: 100,
        displayMode: 'amounts',
        successEffects: [{ type: 'statDelta', stat: 'lucky', amount: 4 }],
        failureEffects: [],
      },
    ]
    await saveBoV2Content(root, 'events', events)
    const loaded = await loadV2Content(async (path) =>
      JSON.parse(await readFile(join(root, 'public', path.slice(1)), 'utf8')),
    )
    const save = createV2Game(loaded, 'ฟ้า', 123)
    const next = chooseV2(loaded, save, events[0].choices[0].id)
    expect(next.stats.lucky).toBe(save.stats.lucky + 4)
    expect(next.history[0].chanceOutcomes[0].succeeded).toBe(true)
  })

  it('rejects an invalid target without replacing the V2 file', async () => {
    const dir = await fixture()
    const before = await readFile(join(dir, 'events.json'), 'utf8')
    const events = JSON.parse(before) as V2Event[]
    events[0].choices[0].effects = [
      { type: 'goToEvent', eventId: 'missing_event' },
    ]
    await expect(
      saveBoV2Content(root, 'events', events),
    ).rejects.toBeInstanceOf(BoValidationError)
    expect(await readFile(join(dir, 'events.json'), 'utf8')).toBe(before)
  })
})
