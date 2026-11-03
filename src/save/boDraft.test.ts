import { describe, expect, it } from 'vitest'
import { names, sample } from '../content/v2/testSample'
import sampleFlow from '../content/v2/sample-flow.json'
import { v2ContentSchema, type V2Content } from '../content/v2/schema'
import { BO_DRAFT_KEY, contentFingerprint, createBoDraftStore } from './boDraft'

const content = v2ContentSchema.parse({ ...sample, names, flow: sampleFlow })

function memoryStorage(initial: Record<string, string> = {}) {
  const saved = new Map(Object.entries(initial))
  return {
    saved,
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value)
    },
    removeItem: (key: string) => {
      saved.delete(key)
    },
  }
}

describe('BO draft keeping', () => {
  it('keeps a draft with the files it came from and clears it', () => {
    const storage = memoryStorage()
    const store = createBoDraftStore(storage)
    expect(store.read()).toBeNull()

    const draft: V2Content = {
      ...content,
      events: content.events.map((event, index) =>
        index ? event : { ...event, title: 'ร่างที่ยังไม่บันทึก' },
      ),
    }
    const now = new Date('2026-11-03T10:00:00.000Z')
    expect(store.write(draft, content, now)).toBe(true)
    expect(store.read()).toEqual({
      savedAt: now.toISOString(),
      base: contentFingerprint(content),
      draft,
    })

    store.clear()
    expect(store.read()).toBeNull()
    expect(storage.saved.has(BO_DRAFT_KEY)).toBe(false)
  })

  it('keeps a draft that still has content errors', () => {
    const store = createBoDraftStore(memoryStorage())
    const broken = {
      ...content,
      flow: { ...content.flow, edges: [] },
    }
    store.write(broken, content)
    expect(store.read()?.draft).toEqual(broken)
  })

  it('ignores a kept value that is not a draft', () => {
    for (const raw of [
      'not json',
      JSON.stringify({ savedAt: 'x', base: 'y', draft: { events: [] } }),
      JSON.stringify({ savedAt: 'x', draft: content }),
    ]) {
      const store = createBoDraftStore(memoryStorage({ [BO_DRAFT_KEY]: raw }))
      expect(store.read()).toBeNull()
    }
  })

  it('reports when storage cannot keep the draft', () => {
    const store = createBoDraftStore({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    expect(store.write(content, content)).toBe(false)
    expect(() => store.clear()).not.toThrow()
  })

  it('fingerprints content so changed files are noticed', () => {
    expect(contentFingerprint(content)).toBe(contentFingerprint(content))
    expect(
      contentFingerprint({
        ...content,
        flow: { ...content.flow, edges: content.flow.edges.slice(1) },
      }),
    ).not.toBe(contentFingerprint(content))
  })
})
