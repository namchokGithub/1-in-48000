import { describe, expect, it } from 'vitest'
import config from '../../../public/content-v2/config.json'
import events from '../../../public/content-v2/events.json'
import characters from '../../../public/content-v2/characters.json'
import assets from '../../../public/content-v2/assets.json'
import endings from '../../../public/content-v2/endings.json'
import names from '../../../public/content-v2/names.json'
import faculties from '../../../public/content-v2/faculties.json'
import majors from '../../../public/content-v2/majors.json'
import electives from '../../../public/content-v2/electives.json'
import flow from '../../../public/content-v2/flow.json'
import { loadV2Content } from './loader'
import {
  chooseV2,
  createV2Game,
  getV2CurrentEvent,
  type V2FlowStep,
} from '../../engine/v2/game'

const files: Record<string, unknown> = {
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
}

describe('extended-years authored story', () => {
  it('has four main and two side events with recaps in every Year 5–8 period', () => {
    const extra = events.filter(
      (event) => event.time.year >= 5 && event.time.year <= 8,
    )
    expect(extra).toHaveLength(96)
    for (const year of [5, 6, 7, 8]) {
      for (const period of ['term1', 'break', 'term2', 'summer']) {
        const inPeriod = extra.filter(
          (event) => event.time.year === year && event.time.period === period,
        )
        expect(inPeriod.filter((event) => event.kind === 'main')).toHaveLength(
          4,
        )
        expect(
          inPeriod.filter((event) => event.kind === 'conditional'),
        ).toHaveLength(2)
      }
    }
    for (const event of extra) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2)
      expect(event.choices.length).toBeLessThanOrEqual(4)
      expect(
        event.choices.every(
          (choice) => 'recap' in choice && Boolean(choice.recap),
        ),
      ).toBe(true)
    }
  })

  it('lets study effort graduate at Year 6, recover at Year 8, or reach dismissal', async () => {
    const content = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    const play = (
      activeYears: readonly number[],
      majorId: string | null = null,
    ) => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        majorId,
        currentTime: { year: 4, period: 'summer' },
        currentNodeId: 'n_graduation_day',
        currentEventId: 'graduation_day',
        stats: { ...save.stats, study: 0, stress: 10 },
      }
      const startTrace: V2FlowStep[] = []
      save = chooseV2(content, save, 'look_ahead', startTrace)
      expect(save.currentTime).toEqual({ year: 5, period: 'term1' })
      const seen: string[] = []
      const reviews: Array<{ nodeId: string; review: string | null }> = []
      for (let step = 0; step < 100 && !save.endingId; step += 1) {
        const event = getV2CurrentEvent(content, save)!
        seen.push(event.id)
        const trace: V2FlowStep[] = []
        save = chooseV2(
          content,
          save,
          `${event.id}_${activeYears.includes(event.time.year) ? 'act' : 'wait'}`,
          trace,
        )
        for (const item of trace)
          if (item.type === 'nextPeriod' && item.review)
            reviews.push({ nodeId: item.nodeId, review: item.review })
      }
      expect(save.endingId).not.toBeNull()
      return { seen, reviews, endingId: save.endingId, startTrace }
    }

    const early = play([5, 6])
    expect(early.seen).toHaveLength(48)
    expect(early.reviews).toContainEqual({
      nodeId: 'next_y6_summer',
      review: 'graduate',
    })

    const sixYearMajor = play([5, 6], 'medicine')
    expect(sixYearMajor.seen).toHaveLength(48)
    expect(sixYearMajor.startTrace).toContainEqual(
      expect.objectContaining({ nodeId: 'next_y4_summer', review: null }),
    )
    expect(sixYearMajor.reviews).toContainEqual({
      nodeId: 'next_y6_summer',
      review: 'graduate',
    })

    const late = play([7, 8])
    expect(late.seen).toHaveLength(80)
    expect(late.reviews).toContainEqual({
      nodeId: 'next_y6_summer',
      review: 'extend',
    })
    expect(late.reviews).toContainEqual({
      nodeId: 'next_extra_years',
      review: 'graduate',
    })

    const dismissed = play([])
    expect(dismissed.seen).toHaveLength(64)
    expect(dismissed.reviews).toContainEqual({
      nodeId: 'next_y6_summer',
      review: 'extend',
    })
    expect(dismissed.reviews).toContainEqual({
      nodeId: 'next_extra_years',
      review: 'dismiss',
    })
    expect(dismissed.endingId).toBe('dismissal')
  })
})
