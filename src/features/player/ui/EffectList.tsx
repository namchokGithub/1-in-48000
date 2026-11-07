import { statLabels, type ChoiceEffectLine } from '../choicePreview'
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
          {line.icons?.map((stat) => (
            <span
              key={stat}
              className="player-effect-icon"
              role="img"
              aria-label={statLabels[stat]}
              title={statLabels[stat]}
            >
              <StatIcon stat={stat} />
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}
