type Named = { id: string; name?: string; title?: string }
type IssueContent = {
  events: Named[]
  endings: Named[]
  characters: Named[]
  assets: { id: string; kind: string }[]
  names: Named[]
  faculties: Named[]
  majors: Named[]
  electives: Named[]
}

export type IssueSection =
  | 'settings'
  | 'events'
  | 'endings'
  | 'flow'
  | 'speakers'
  | 'backgrounds'
  | 'portraits'
  | 'sounds'
  | 'names'
  | 'faculties'
  | 'majors'
  | 'electives'

export type IssueTarget = {
  section: IssueSection
  index?: number
  id?: string
  label: string
  field: string
}

const listLabels = {
  events: 'เหตุการณ์',
  endings: 'ตอนจบ',
  characters: 'ตัวละคร (NPC)',
  names: 'ชื่อผู้เล่น',
  faculties: 'คณะ',
  majors: 'สาขา',
  electives: 'วิชาเสรี',
} as const

const assetSections: Record<string, IssueSection> = {
  scene: 'backgrounds',
  portrait: 'portraits',
  bgm: 'sounds',
  sfx: 'sounds',
}

// Where a validation issue path such as `events.12.choices.0.text` lives in
// the BO: the tab, the item to select, and a readable name for the item.
export function issueTarget(
  path: string,
  content: IssueContent,
): IssueTarget | null {
  const [file, rawIndex, ...rest] = path.split('.')
  if (file === 'config')
    return {
      section: 'settings',
      label: 'ตั้งค่าเกม',
      field: [rawIndex, ...rest].filter(Boolean).join('.'),
    }
  if (file === 'flow')
    return {
      section: 'flow',
      label: 'Flow เรื่อง',
      field: [rawIndex, ...rest].filter(Boolean).join('.'),
    }
  const index = Number(rawIndex)
  const field = rest.join('.')
  if (file === 'assets') {
    const asset = content.assets[index]
    if (!asset) return null
    return {
      section: assetSections[asset.kind] ?? 'backgrounds',
      index,
      id: asset.id,
      label: `Asset ${asset.id}`,
      field,
    }
  }
  if (!(file in listLabels)) return null
  const key = file as keyof typeof listLabels
  const item = content[key][index]
  if (!item) return null
  const name = item.title ?? item.name
  return {
    section: key === 'characters' ? 'speakers' : key,
    index,
    id: item.id,
    label: `${listLabels[key]}${name ? ` “${name}”` : ''} (${item.id})`,
    field,
  }
}
