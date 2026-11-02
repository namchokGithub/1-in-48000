type Option = { value: string; label: string }

function normalizeSearchText(value: string) {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('th-TH')
    .replace(/\u0e4c/g, '')
    .trim()
}

export function filterPlayerSelectOptions(options: Option[], query: string) {
  const normalizedQuery = normalizeSearchText(query)
  return normalizedQuery
    ? options.filter((option) =>
        normalizeSearchText(option.label).includes(normalizedQuery),
      )
    : options
}
