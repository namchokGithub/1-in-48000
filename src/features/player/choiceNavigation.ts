// The next choice the keyboard highlight can move to, skipping disabled ones
// and wrapping around; -1 when none can be picked. Start from -1 for the first.
export const keyboardChoiceSelector =
  'button.player-option, .player-checkbox input, .player-select-trigger'

export function nextEnabledIndex(
  disabled: boolean[],
  current: number,
  step: 1 | -1,
): number {
  const count = disabled.length
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (((current + step * offset) % count) + count) % count
    if (!disabled[index]) return index
  }
  return -1
}
