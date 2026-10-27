export function reorder<T>(items: T[], source: number, target: number): T[] {
  if (
    source < 0 ||
    source >= items.length ||
    target < 0 ||
    target >= items.length ||
    source === target
  )
    return items
  const next = [...items]
  const [item] = next.splice(source, 1)
  next.splice(target, 0, item)
  return next
}
