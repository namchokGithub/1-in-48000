import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { saveBoContent, BoValidationError } from './bo-server'
import { loadV2Content } from './src/content/v2/loader'
import {
  chooseV2,
  chooseV2Many,
  chooseV2Program,
  createV2Game,
} from './src/engine/v2/game'
import type { V2Content, V2Event } from './src/content/v2/schema'
import { createV2PreviewSession } from './src/features/bo/preview'

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
    'faculties',
    'majors',
    'electives',
    'flow',
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
    await saveBoContent(root, 'events', events)
    const loaded = await loadV2Content(async (path) =>
      JSON.parse(await readFile(join(root, 'public', path.slice(1)), 'utf8')),
    )
    const save = createV2Game(loaded, 123)
    const started = chooseV2Program(loaded, save, 'humanities', 'thai_language')
    const next = chooseV2(loaded, started, events[0].choices[0].id)
    expect(next.stats.lucky).toBe(save.stats.lucky + 4)
    expect(next.history[1].chanceOutcomes[0].succeeded).toBe(true)
  })

  it('rejects removing an event that is still on the flow board', async () => {
    const dir = await fixture()
    const before = await readFile(join(dir, 'events.json'), 'utf8')
    const events = JSON.parse(before) as V2Event[]
    await expect(
      saveBoContent(
        root,
        'events',
        events.filter((event) => event.id !== 'first_class'),
      ),
    ).rejects.toBeInstanceOf(BoValidationError)
    expect(await readFile(join(dir, 'events.json'), 'utf8')).toBe(before)
  })

  it('writes speaker and asset edits through the V2 content files', async () => {
    const dir = await fixture()
    const characters = JSON.parse(
      await readFile(join(dir, 'characters.json'), 'utf8'),
    ) as Array<{ id: string; name: string }>
    const speaker = { id: 'new_speaker', name: 'ดาว' }
    await saveBoContent(root, 'characters', [...characters, speaker])
    expect(
      JSON.parse(await readFile(join(dir, 'characters.json'), 'utf8')),
    ).toContainEqual(speaker)

    const assets = JSON.parse(
      await readFile(join(dir, 'assets.json'), 'utf8'),
    ) as Array<{ id: string; kind: string; path: string }>
    const scene = {
      id: 'new_scene',
      kind: 'scene',
      path: '/assets/scene/new-scene.png',
    }
    const file = join(root, 'public', scene.path.slice(1))
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, '')
    await saveBoContent(root, 'assets', [...assets, scene])
    expect(
      JSON.parse(await readFile(join(dir, 'assets.json'), 'utf8')),
    ).toContainEqual(scene)
  })

  it('writes the loan settings in config and rejects a negative rate', async () => {
    const dir = await fixture()
    const config = JSON.parse(
      await readFile(join(dir, 'config.json'), 'utf8'),
    ) as V2Content['config']
    await saveBoContent(root, 'config', {
      ...config,
      loan: { ...config.loan, annualRatePercent: 12 },
    })
    const saved = JSON.parse(
      await readFile(join(dir, 'config.json'), 'utf8'),
    ) as V2Content['config']
    expect(saved.loan.annualRatePercent).toBe(12)
    await expect(
      saveBoContent(root, 'config', {
        ...config,
        loan: { ...config.loan, annualRatePercent: -1 },
      }),
    ).rejects.toBeInstanceOf(BoValidationError)
  })

  it('rejects a missing asset file without replacing content', async () => {
    const dir = await fixture()
    const before = await readFile(join(dir, 'endings.json'), 'utf8')
    const assets = JSON.parse(
      await readFile(join(dir, 'assets.json'), 'utf8'),
    ) as Array<{ path: string }>
    await rm(join(root, 'public', assets[0].path.slice(1)))
    await expect(
      saveBoContent(root, 'endings', JSON.parse(before)),
    ).rejects.toBeInstanceOf(BoValidationError)
    expect(await readFile(join(dir, 'endings.json'), 'utf8')).toBe(before)
  })

  it('saves a multi-select event with faculty and major conditions and previews it before placement', async () => {
    const dir = await fixture()
    const events = JSON.parse(
      await readFile(join(dir, 'events.json'), 'utf8'),
    ) as V2Event[]
    const authored: V2Event = {
      ...events.find((event) => event.id === 'orientation')!,
      id: 'faculty_group_project',
      title: 'งานกลุ่มคณะมนุษยศาสตร์',
      conditions: [
        { type: 'faculty', facultyId: 'humanities' },
        { type: 'major', majorId: 'thai_language' },
      ],
      selection: { type: 'multiple', min: 2, max: 2 },
      choices: [
        {
          id: 'read_notes',
          text: 'อ่านสรุป',
          conditions: [],
          effects: [{ type: 'statDelta', stat: 'study', amount: 2 }],
        },
        {
          id: 'help_group',
          text: 'ช่วยเพื่อน',
          conditions: [],
          effects: [{ type: 'setFlag', flagId: 'helped_group', value: true }],
        },
      ],
    }
    await saveBoContent(root, 'events', [...events, authored])
    const loaded = await loadV2Content(async (path) =>
      JSON.parse(await readFile(join(root, 'public', path.slice(1)), 'utf8')),
    )
    const preview = createV2PreviewSession(loaded, authored.id)
    expect(preview.save).toMatchObject({
      facultyId: 'humanities',
      majorId: 'thai_language',
    })
    expect(preview.save.currentEventId).toBe(authored.id)
    expect(() =>
      chooseV2Many(preview.content, preview.save, ['help_group', 'read_notes']),
    ).toThrow('No path from bo_preview_event (next)')
  })
})

describe('BO program and player catalogs', () => {
  it('writes faculties, majors, electives, names, and portrait assets', async () => {
    const dir = await fixture()
    const faculties = JSON.parse(
      await readFile(join(dir, 'faculties.json'), 'utf8'),
    ) as Array<{ id: string; name: string; supportsSixYear: boolean }>
    const majors = JSON.parse(
      await readFile(join(dir, 'majors.json'), 'utf8'),
    ) as Array<{
      id: string
      facultyId: string
      name: string
      programYears: number
    }>
    const electives = JSON.parse(
      await readFile(join(dir, 'electives.json'), 'utf8'),
    ) as Array<{ id: string; name: string; effects: unknown[] }>
    const names = JSON.parse(
      await readFile(join(dir, 'names.json'), 'utf8'),
    ) as Array<{
      id: string
      name: string
      portraits?: { casual?: string; student?: string }
    }>
    const assets = JSON.parse(
      await readFile(join(dir, 'assets.json'), 'utf8'),
    ) as Array<{ id: string; kind: string; path: string }>

    const faculty = {
      id: 'science',
      name: 'คณะวิทยาศาสตร์',
      supportsSixYear: false,
    }
    const major = {
      id: 'biology',
      facultyId: 'science',
      name: 'ชีววิทยา',
      programYears: 4,
    }
    const elective = {
      id: 'field_work',
      name: 'สำรวจภาคสนาม',
      effects: [{ type: 'statDelta', stat: 'study', amount: 3 }],
    }
    const portrait = {
      id: 'fah_portrait',
      kind: 'portrait',
      path: '/assets/portrait/fah.png',
    }
    const name = {
      id: 'fah_new',
      name: 'ฟ้าใหม่',
      portraits: { casual: portrait.id, student: portrait.id },
    }
    const portraitFile = join(root, 'public', portrait.path.slice(1))
    await mkdir(dirname(portraitFile), { recursive: true })
    await writeFile(portraitFile, '')

    await saveBoContent(root, 'faculties', [...faculties, faculty])
    await saveBoContent(root, 'majors', [...majors, major])
    await saveBoContent(root, 'electives', [...electives, elective])
    await saveBoContent(root, 'assets', [...assets, portrait])
    await saveBoContent(root, 'names', [...names, name])

    for (const [file, item] of [
      ['faculties', faculty],
      ['majors', major],
      ['electives', elective],
      ['assets', portrait],
      ['names', name],
    ] as const) {
      expect(
        JSON.parse(await readFile(join(dir, `${file}.json`), 'utf8')),
      ).toContainEqual(item)
    }
  })

  it('rejects duplicate player name IDs without replacing the file', async () => {
    const dir = await fixture()
    const before = await readFile(join(dir, 'names.json'), 'utf8')
    const names = JSON.parse(before) as Array<{ id: string; name: string }>
    await expect(
      saveBoContent(root, 'names', [
        ...names,
        { ...names[0], name: 'ชื่อซ้ำ' },
      ]),
    ).rejects.toMatchObject({
      issues: [{ path: 'names', message: 'Name IDs must be unique' }],
    })
    expect(await readFile(join(dir, 'names.json'), 'utf8')).toBe(before)
  })

  it('rejects a six-year major in a faculty without six-year support', async () => {
    const dir = await fixture()
    const before = await readFile(join(dir, 'majors.json'), 'utf8')
    const majors = JSON.parse(before) as Array<{
      id: string
      facultyId: string
      programYears: number
    }>
    await expect(
      saveBoContent(root, 'majors', [
        ...majors,
        {
          id: 'long_thai',
          facultyId: 'humanities',
          name: 'ภาษาไทย 6 ปี',
          programYears: 6,
        },
      ]),
    ).rejects.toBeInstanceOf(BoValidationError)
    expect(await readFile(join(dir, 'majors.json'), 'utf8')).toBe(before)
  })

  it('keeps names intact when a portrait reference is not in the manifest', async () => {
    const dir = await fixture()
    const before = await readFile(join(dir, 'names.json'), 'utf8')
    const names = JSON.parse(before) as Array<{
      id: string
      name: string
      portraits?: { casual?: string; student?: string }
    }>
    await expect(
      saveBoContent(root, 'names', [
        ...names,
        {
          id: 'new_player',
          name: 'นิสิตใหม่',
          portraits: {
            casual: 'missing_portrait',
            student: 'missing_portrait',
          },
        },
      ]),
    ).rejects.toMatchObject({
      issues: [
        {
          path: `names.${names.length}.portraits.casual`,
          message: 'Unknown portrait asset: missing_portrait',
        },
        {
          path: `names.${names.length}.portraits.student`,
          message: 'Unknown portrait asset: missing_portrait',
        },
      ],
    })
    expect(await readFile(join(dir, 'names.json'), 'utf8')).toBe(before)
  })

  it('keeps faculties intact when a major still refers to the removed faculty', async () => {
    const dir = await fixture()
    const before = await readFile(join(dir, 'faculties.json'), 'utf8')
    const faculties = JSON.parse(before) as Array<{ id: string }>
    await expect(
      saveBoContent(root, 'faculties', faculties.slice(1)),
    ).rejects.toMatchObject({
      issues: [
        {
          path: 'majors.0.facultyId',
          message: `Unknown faculty: ${faculties[0].id}`,
        },
      ],
    })
    expect(await readFile(join(dir, 'faculties.json'), 'utf8')).toBe(before)
  })
})

describe('BO flow writing', () => {
  it('saves a flow edit and rejects an unconnected choice without replacing the file', async () => {
    const dir = await fixture()
    const before = JSON.parse(
      await readFile(join(dir, 'flow.json'), 'utf8'),
    ) as V2Content['flow']
    const moved = {
      ...before,
      nodes: before.nodes.map((node) =>
        node.id === 'start' ? { ...node, position: { x: 1, y: 2 } } : node,
      ),
    }
    await saveBoContent(root, 'flow', moved)
    const written = await readFile(join(dir, 'flow.json'), 'utf8')
    expect(JSON.parse(written)).toEqual(moved)
    const broken = {
      ...moved,
      edges: moved.edges.filter((edge) => edge.from !== 'n_orientation'),
    }
    await expect(saveBoContent(root, 'flow', broken)).rejects.toBeInstanceOf(
      BoValidationError,
    )
    expect(await readFile(join(dir, 'flow.json'), 'utf8')).toBe(written)
  })
})
