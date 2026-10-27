export function randomId(
  prefix: string,
  existing: Iterable<string>,
  random: () => string = () => crypto.randomUUID(),
): string {
  const used = new Set(existing)
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = random()
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()
      .slice(0, 8)
    const candidate = `${prefix}_${suffix}`
    if (suffix && !used.has(candidate)) return candidate
  }
  throw new Error('Could not create a unique ID')
}
