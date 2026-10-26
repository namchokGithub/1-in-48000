export function rollIndex(
  state: number,
  count: number,
): {
  index: number
  nextState: number
} {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('Random selection requires at least one candidate')
  }
  const nextState = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
  return { index: Math.floor((nextState / 4_294_967_296) * count), nextState }
}
