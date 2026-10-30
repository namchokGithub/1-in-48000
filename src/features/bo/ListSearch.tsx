export function ListSearch({
  label,
  value,
  placeholder = 'ชื่อหรือ ID',
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (next: string) => void
}) {
  return (
    <input
      className="field bo-list-search"
      type="search"
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
