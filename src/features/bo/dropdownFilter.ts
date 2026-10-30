type FilterableOption = { value: string; label: string }

export const SEARCH_THRESHOLD = 8

export function isSearchable(optionCount: number): boolean {
  return optionCount >= SEARCH_THRESHOLD
}

// Indexes of the options whose label or value contains the query.
export function filterOptionIndexes(
  options: FilterableOption[],
  query: string,
): number[] {
  const needle = query.trim().toLocaleLowerCase('th-TH')
  return options.flatMap((option, index) =>
    !needle ||
    option.label.toLocaleLowerCase('th-TH').includes(needle) ||
    option.value.toLocaleLowerCase('th-TH').includes(needle)
      ? [index]
      : [],
  )
}
