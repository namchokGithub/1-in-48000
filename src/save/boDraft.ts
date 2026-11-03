import type { V2Content } from '../content/v2/schema'

export const BO_DRAFT_KEY = '1-in-48000:bo-draft'

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** An unsaved BO draft kept so a reload or dev server restart cannot lose it. */
export type StoredBoDraft = {
  savedAt: string
  /** Fingerprint of the content files the draft was edited from. */
  base: string
  draft: V2Content
}

const listFiles = [
  'events',
  'endings',
  'characters',
  'assets',
  'faculties',
  'majors',
  'electives',
  'names',
] as const

/**
 * A draft may hold content errors the author has not fixed yet, so it is not
 * checked against the content schema. It only needs the shape the BO editor
 * opens without crashing.
 */
function isDraftShape(value: unknown): value is V2Content {
  if (!value || typeof value !== 'object') return false
  const draft = value as Record<string, unknown>
  const flow = draft.flow as Record<string, unknown> | undefined
  return (
    !!draft.config &&
    typeof draft.config === 'object' &&
    listFiles.every((file) => Array.isArray(draft[file])) &&
    !!flow &&
    Array.isArray(flow.nodes) &&
    Array.isArray(flow.edges)
  )
}

/** Short FNV-1a fingerprint, enough to tell whether files changed. */
export function contentFingerprint(content: V2Content): string {
  const text = JSON.stringify(content)
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${text.length.toString(36)}-${(hash >>> 0).toString(36)}`
}

export function createBoDraftStore(
  storage: DraftStorage = window.localStorage,
) {
  return {
    read(): StoredBoDraft | null {
      try {
        const raw = storage.getItem(BO_DRAFT_KEY)
        if (!raw) return null
        const stored = JSON.parse(raw) as Partial<StoredBoDraft> | null
        if (
          !stored ||
          typeof stored.savedAt !== 'string' ||
          typeof stored.base !== 'string' ||
          !isDraftShape(stored.draft)
        )
          return null
        return stored as StoredBoDraft
      } catch {
        return null
      }
    },
    write(draft: V2Content, base: V2Content, now = new Date()): boolean {
      try {
        storage.setItem(
          BO_DRAFT_KEY,
          JSON.stringify({
            savedAt: now.toISOString(),
            base: contentFingerprint(base),
            draft,
          } satisfies StoredBoDraft),
        )
        return true
      } catch {
        return false
      }
    },
    clear() {
      try {
        storage.removeItem(BO_DRAFT_KEY)
      } catch {
        /* Nothing to clear when storage is unavailable. */
      }
    },
  }
}

export type BoDraftStore = ReturnType<typeof createBoDraftStore>
