import { v2ContentSchema, type V2Content } from './schema'

type ReadJson = (path: string) => Promise<unknown>

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Cannot load content: ${path}`)
  return response.json()
}

export async function loadV2Content(
  readJson: ReadJson = fetchJson,
): Promise<V2Content> {
  const [
    config,
    events,
    characters,
    assets,
    endings,
    names,
    faculties,
    majors,
    electives,
    flow,
  ] = await Promise.all(
    [
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
    ].map((name) => readJson(`/content-v2/${name}.json`)),
  )
  return v2ContentSchema.parse({
    config,
    events,
    characters,
    assets,
    endings,
    names,
    faculties,
    majors,
    electives,
    flow,
  })
}
