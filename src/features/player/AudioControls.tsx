export function AudioControls({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="button button-secondary player-header-button"
      aria-pressed={enabled}
      aria-label={enabled ? 'ปิดเพลง' : 'เปิดเพลง'}
      onClick={onToggle}
    >
      <span aria-hidden="true">{enabled ? '♫' : '♪'}</span>
      เพลง{enabled ? 'เปิด' : 'ปิด'}
    </button>
  )
}
