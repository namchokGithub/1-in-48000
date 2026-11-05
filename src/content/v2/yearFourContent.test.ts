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

describe('year-four authored story', () => {
  it('has eight main and four side events with recaps in every period', () => {
    const yearFour = events.filter((event) => event.time?.year === 4)
    for (const period of ['term1', 'break', 'term2', 'summer']) {
      const inPeriod = yearFour.filter((event) => event.time?.period === period)
      expect(inPeriod.filter((event) => event.kind === 'main')).toHaveLength(8)
      expect(
        inPeriod.filter((event) => event.kind === 'conditional'),
      ).toHaveLength(4)
    }
    for (const event of yearFour) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2)
      expect(event.choices.length).toBeLessThanOrEqual(5)
      expect(
        event.choices.every(
          (choice) => 'recap' in choice && Boolean(choice.recap),
        ),
      ).toBe(true)
    }
  })

  it('plays research, community, and skipped-side routes through the year-four review', async () => {
    const loaded = await loadV2Content(
      async (path) => files[path.split('/').at(-1)?.replace('.json', '') ?? ''],
    )
    // This checks the study review routes, so stat endings that would end a
    // low-study run earlier are left out.
    const content = {
      ...loaded,
      config: { ...loaded.config, statEndings: [] },
    }
    const play = (route: 'research' | 'community' | 'none') => {
      let save = createV2Game(content, 42)
      save = {
        ...save,
        currentTime: { year: 3, period: 'summer' },
        currentNodeId: 'n_y3_summer_next_year',
        currentEventId: 'y3_summer_next_year',
        flags: route === 'none' ? {} : { met_mali: true, joined_club: true },
        stats: { ...save.stats, study: route === 'none' ? -100 : 100 },
      }
      save = chooseV2(content, save, 'leave_notes_open')
      const seen: string[] = []
      let review: 'graduate' | 'extend' | 'dismiss' | null = null
      for (let step = 0; step < 70; step += 1) {
        const event = getV2CurrentEvent(content, save)
        if (!event || event.time.year !== 4) break
        seen.push(event.id)
        const routeChoices: Record<string, string> = {
          thesis_topic:
            route === 'research'
              ? 'research_thesis'
              : route === 'community'
                ? 'community_thesis'
                : 'open_thesis',
          y4_term1_outline: route === 'none' ? 'keep_private' : 'share_outline',
          career_fair:
            route === 'community' ? 'community_work' : 'explore_options',
          y4_break_junior_question:
            route === 'none' ? 'decline_junior' : 'help_junior',
          y4_term2_draft_review:
            route === 'none' ? 'review_alone' : 'request_review',
          y4_summer_portfolio_export:
            route === 'none' ? 'keep_portfolio' : 'send_portfolio',
        }
        const trace: V2FlowStep[] = []
        save = chooseV2(
          content,
          save,
          routeChoices[event.id] ?? event.choices[0].id,
          trace,
        )
        const stepAtReview = trace.find(
          (item) =>
            item.type === 'nextPeriod' && item.nodeId === 'next_y4_summer',
        )
        if (stepAtReview?.type === 'nextPeriod') review = stepAtReview.review
      }
      expect(review).toBe(route === 'none' ? 'extend' : 'graduate')
      return seen
    }

    const research = play('research')
    const community = play('community')
    const none = play('none')
    const shared = content.events.filter(
      (event) => event.time.year === 4 && event.kind === 'main',
    )
    for (const event of shared)
      for (const seen of [research, community, none])
        expect(seen).toContain(event.id)
    for (const id of [
      'y4_term1_research_archive',
      'y4_break_research_reply',
      'y4_term2_research_source',
    ])
      expect(research).toContain(id)
    for (const id of [
      'y4_term1_community_contact',
      'y4_break_community_update',
      'y4_term2_community_visit',
      'y4_summer_community_contact',
    ])
      expect(community).toContain(id)
    expect(
      none.some(
        (id) =>
          content.events.find((event) => event.id === id)?.kind ===
          'conditional',
      ),
    ).toBe(false)
  })
})
