import { describe, expect, it } from 'vitest'
import configJson from '../../public/content/config.json'
import eventsJson from '../../public/content/events.json'
import endingsJson from '../../public/content/endings.json'
import assetsJson from '../../public/content/assets.json'
import {
  assetListSchema,
  endingListSchema,
  eventListSchema,
  gameConfigSchema,
} from './schema'
import {
  choose,
  createGame,
  getAvailableChoices,
  getCurrentEvent,
  summarizeLife,
} from '../engine/game'
import { loadStoredSave } from '../save/migrations'

const content = {
  config: gameConfigSchema.parse(configJson),
  events: eventListSchema.parse(eventsJson),
  endings: endingListSchema.parse(endingsJson),
}
const assets = assetListSchema.parse(assetsJson)

function play(
  backgroundId: string,
  preferred: Record<string, string> = {},
  seed = 12345,
) {
  let save = createGame(content, 'ฟ้า', seed, backgroundId)
  const visited: string[] = []
  for (let step = 0; step < 45 && !save.endingId; step += 1) {
    const event = getCurrentEvent(content, save)
    if (!event) throw new Error('Missing event before ending')
    visited.push(event.id)
    const available = getAvailableChoices(event, save)
    const choiceId = preferred[event.id] ?? available[0]?.id
    if (!choiceId) throw new Error(`No choice in ${event.id}`)
    save = choose(content, save, choiceId)
  }
  if (!save.endingId) throw new Error('Game did not end')
  return { save, visited }
}

describe('four-year MVP content', () => {
  it('has 35 events and seven scene assets across all four years', () => {
    expect(content.events).toHaveLength(35)
    expect(new Set(content.events.map((event) => event.time.year))).toEqual(
      new Set([1, 2, 3, 4]),
    )
    expect(assets.filter((asset) => asset.kind === 'scene')).toHaveLength(7)
  })

  it('reaches distinct study, community, and general endings after graduation', () => {
    const academic = play('supported', { thesis_topic: 'research_thesis' })
    const community = play('outgoing', {
      thesis_topic: 'community_thesis',
      career_fair: 'community_work',
    })
    const general = play('balanced', {
      thesis_topic: 'open_thesis',
      career_fair: 'explore_options',
    })
    expect(academic.save.endingId).toBe('academic_path')
    expect(community.save.endingId).toBe('community_path')
    expect(general.save.endingId).toBe('graduation')
    for (const result of [academic, community, general]) {
      expect(result.visited).toContain('term_reflection')
      expect(result.visited).toContain('thesis_defense')
      expect(result.visited).toContain('graduation_day')
      expect(result.save.currentTime).toEqual({ year: 4, period: 'summer' })
      expect(result.visited.length).toBeGreaterThan(25)
    }
  })

  it('merges a club branch back into the shared main story', () => {
    const joined = play('balanced', { club_fair: 'join_club' })
    const independent = play('balanced', { club_fair: 'keep_schedule' })
    expect(joined.visited).toContain('club_project')
    expect(independent.visited).not.toContain('club_project')
    expect(joined.visited).toContain('graduation_day')
    expect(independent.visited).toContain('graduation_day')
  })

  it('makes the low-money and mentor branches reachable by choices', () => {
    const lowMoney = play('balanced', {
      cafeteria_budget: 'treat_friend',
      rainy_commute: 'wait_bus',
      return_to_campus: 'take_more_classes',
    })
    const mentored = play('balanced', { project_pitch: 'ask_mentor' })
    const independent = play('balanced', { project_pitch: 'pitch_alone' })
    expect(lowMoney.visited).toContain('scholarship_notice')
    expect(mentored.visited).toContain('mentor_feedback')
    expect(independent.visited).not.toContain('mentor_feedback')
  })

  it('applies an earlier course choice after the thesis defense', () => {
    let save = createGame(content, 'ฟ้า', 12345, 'balanced')
    for (
      let step = 0;
      step < 45 && save.currentEventId !== 'course_choice';
      step += 1
    ) {
      const event = getCurrentEvent(content, save)
      if (!event) throw new Error('Course choice not reached')
      save = choose(content, save, getAvailableChoices(event, save)[0].id)
    }
    save = choose(content, save, 'take_hard_course')
    expect(
      save.pendingEffects.some(
        (pending) => pending.sourceEventId === 'course_choice',
      ),
    ).toBe(true)
    for (
      let step = 0;
      step < 45 && save.currentEventId !== 'thesis_defense';
      step += 1
    ) {
      const event = getCurrentEvent(content, save)
      if (!event) throw new Error('Thesis defense not reached')
      save = choose(content, save, getAvailableChoices(event, save)[0].id)
    }
    const before = save.stats.study
    save = choose(content, save, 'present_carefully')
    expect(save.stats.study).toBe(Math.min(100, before + 10))
    expect(
      save.pendingEffects.some(
        (pending) => pending.sourceEventId === 'course_choice',
      ),
    ).toBe(false)
  })

  it('keeps an already completed first-term save readable', () => {
    const ended = createGame(content, 'ฟ้า', 7)
    const old = {
      ...ended,
      contentVersion: '0.3.0',
      currentTime: { year: 1, period: 'break' },
      currentEventId: null,
      endingId: 'first_term_steady',
    }
    const migrated = loadStoredSave(
      JSON.stringify(old),
      content.config.contentVersion,
    )
    expect(summarizeLife(content, migrated).title).toBe('ก้าวแรกของคุณ')
  })

  it('reaches graduation from each starting background and several RNG seeds', () => {
    for (const background of content.config.backgrounds) {
      for (const seed of [1, 2, 12345, 4_294_967_295]) {
        const result = play(background.id, {}, seed)
        expect(result.visited).toContain('graduation_day')
        expect(result.save.endingId).not.toMatch(/^first_term_/)
      }
    }
  })
})
