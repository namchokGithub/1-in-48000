import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * A callback whose identity never changes but always runs the latest `fn`, so
 * memoized children do not re-render when only the parent's closures change.
 */
export function useStableCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  const ref = useRef(fn)
  useLayoutEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: Args) => ref.current(...args), [])
}
