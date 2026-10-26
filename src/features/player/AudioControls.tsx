import type { AudioChannel, AudioVolumes } from '../../save/audioSettings'

const channels: { id: AudioChannel; label: string }[] = [
  { id: 'bgm', label: 'เพลง' },
  { id: 'ambience', label: 'บรรยากาศ' },
  { id: 'sfx', label: 'เอฟเฟกต์' },
]

export function AudioControls({
  volumes,
  onChange,
}: {
  volumes: AudioVolumes
  onChange: (channel: AudioChannel, volume: number) => void
}) {
  return (
    <details className="audio-controls">
      <summary className="button button-secondary">ตั้งค่าเสียง</summary>
      <div className="audio-controls-panel panel">
        {channels.map(({ id, label }) => (
          <label key={id} className="audio-control-row">
            <span>{label}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(volumes[id] * 100)}
              onChange={(event) =>
                onChange(id, Number(event.target.value) / 100)
              }
              aria-label={`ระดับเสียง${label}`}
            />
            <output>{Math.round(volumes[id] * 100)}%</output>
          </label>
        ))}
      </div>
    </details>
  )
}
