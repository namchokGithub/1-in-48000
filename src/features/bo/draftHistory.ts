export type DraftHistory<T> = {
  past: T[]
  present: T
  future: T[]
}

const HISTORY_LIMIT = 100

export function createHistory<T>(present: T): DraftHistory<T> {
  return { past: [], present, future: [] }
}

export function commitHistory<T>(
  history: DraftHistory<T>,
  next: T,
): DraftHistory<T> {
  if (next === history.present) return history
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  }
}

export function undoHistory<T>(history: DraftHistory<T>): DraftHistory<T> {
  if (!history.past.length) return history
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  }
}

export function redoHistory<T>(history: DraftHistory<T>): DraftHistory<T> {
  if (!history.future.length) return history
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: history.future[0],
    future: history.future.slice(1),
  }
}
