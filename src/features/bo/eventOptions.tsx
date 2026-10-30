// Event ID options for a dropdown; an ID that no longer exists stays listed
// so the field still shows it next to its error.
export function eventOptions(eventIds: string[], current: string) {
  const ids =
    current && !eventIds.includes(current) ? [current, ...eventIds] : eventIds
  return ids.map((id) => (
    <option key={id} value={id}>
      {id}
    </option>
  ))
}
