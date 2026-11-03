export function nextPlayerSelectIndex(
  active: number,
  count: number,
  key: 'ArrowDown' | 'ArrowUp',
): number {
  const step = key === 'ArrowDown' ? 1 : -1
  return (active + step + count) % count
}
