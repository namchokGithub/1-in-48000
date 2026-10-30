import type { ChoiceEffectLine } from '../choicePreview'
import { StatIcon } from './StatIcon'

export function EffectList({
  lines,
  className = '',
}: {
  lines: ChoiceEffectLine[]
  className?: string
}) {
  if (!lines.length) return null
  return (
    <span className={`player-effect-list ${className}`}>
      {lines.map((line, index) => (
        <span key={`${line.text}-${index}`} className="player-effect">
          {line.stat && <StatIcon stat={line.stat} />}
          {line.text}
        </span>
      ))}
    </span>
  )
}
