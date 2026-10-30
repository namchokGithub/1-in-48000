import { describe, expect, it } from 'vitest'
import { issueTarget } from './issueTarget'

const content = {
  events: [{ id: 'orientation', title: 'วันปฐมนิเทศ' }],
  endings: [{ id: 'dismissal', title: 'พ้นสภาพ' }],
  characters: [{ id: 'mali', name: 'มะลิ' }],
  assets: [
    { id: 'classroom', kind: 'scene' },
    { id: 'mali_private', kind: 'portrait' },
    { id: 'kanto', kind: 'bgm' },
  ],
  names: [{ id: 'fah', name: 'ฟ้า' }],
  faculties: [{ id: 'science', name: 'วิทยาศาสตร์' }],
  majors: [],
  electives: [],
}

describe('issue target', () => {
  it('points an event issue at the event and names it', () => {
    expect(issueTarget('events.0.choices.1.text', content)).toEqual({
      section: 'events',
      index: 0,
      id: 'orientation',
      label: 'เหตุการณ์ “วันปฐมนิเทศ” (orientation)',
      field: 'choices.1.text',
    })
  })

  it('points a config issue at the game settings tab', () => {
    expect(issueTarget('config.loan.annualRatePercent', content)).toEqual({
      section: 'settings',
      label: 'ตั้งค่าเกม',
      field: 'loan.annualRatePercent',
    })
  })

  it('points an ending issue at the ending', () => {
    expect(issueTarget('endings.0.title', content)).toEqual({
      section: 'endings',
      index: 0,
      id: 'dismissal',
      label: 'ตอนจบ “พ้นสภาพ” (dismissal)',
      field: 'title',
    })
  })

  it('opens the asset tab that matches the asset kind', () => {
    expect(issueTarget('assets.0.path', content)?.section).toBe('backgrounds')
    expect(issueTarget('assets.1.path', content)?.section).toBe('portraits')
    expect(issueTarget('assets.2.path', content)?.section).toBe('sounds')
  })

  it('opens the tab of characters, catalogs, names, and the flow', () => {
    expect(issueTarget('characters.0.portraitAssetId', content)).toEqual({
      section: 'speakers',
      index: 0,
      id: 'mali',
      label: 'ตัวละคร (NPC) “มะลิ” (mali)',
      field: 'portraitAssetId',
    })
    expect(issueTarget('names.0.portraits.casual', content)?.section).toBe(
      'names',
    )
    expect(issueTarget('faculties.0.name', content)?.section).toBe('faculties')
    expect(issueTarget('flow.edges.3.to', content)).toEqual({
      section: 'flow',
      label: 'Flow เรื่อง',
      field: 'edges.3.to',
    })
  })

  it('has no target for an unknown file or a missing item', () => {
    expect(issueTarget('unknown.title', content)).toBeNull()
    expect(issueTarget('events.9.title', content)).toBeNull()
  })
})
