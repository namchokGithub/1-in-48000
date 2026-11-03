import { toast } from 'sonner'
import type { V2Content } from '../../content/v2/schema'
import { getV2LastRecaps, summarizeV2Life } from '../../engine/v2/game'
import { formatGameTime } from '../player/labels'
import { EndingView } from '../player/EndingView'
import { SceneView } from '../player/SceneView'
import { playerPortraitPath, playerProgram } from '../player/playerIdentity'
import { describeFlowStep } from './flowTrace'
import {
  decideSimulation,
  describeDecision,
  rewindSimulation,
  simulationOutdated,
  simulationSave,
  startSimulation,
  type Simulation,
  type SimulationDecision,
} from './simulation'

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1
}

export function SimulationPanel({
  simulation,
  draft,
  onChange,
  onExit,
}: {
  simulation: Simulation
  draft: V2Content
  onChange: (simulation: Simulation) => void
  onExit: () => void
}) {
  const { content } = simulation
  const save = simulationSave(simulation)
  const event = content.events.find((item) => item.id === save.currentEventId)
  const summary = save.endingId ? summarizeV2Life(content, save) : null
  const outdated = simulationOutdated(simulation, draft)
  const startEvent = content.events.find(
    (item) => item.id === simulation.eventId,
  )

  function restart(seed = simulation.seed) {
    const next = startSimulation(draft, simulation.eventId, seed)
    if (typeof next === 'string') toast.error(next)
    else onChange(next)
  }
  const decide = (decision: SimulationDecision) =>
    onChange(decideSimulation(simulation, decision))

  return (
    <aside className="bo-simulation" aria-label="Simulation">
      <div className="bo-simulation-head">
        <div>
          <p className="eyebrow">Simulation · ไม่บันทึกเซฟ</p>
          <h2 className="font-extrabold">
            {startEvent?.title ?? simulation.eventId}
          </h2>
          <p className="muted text-xs">Seed {simulation.seed}</p>
        </div>
        <div className="bo-simulation-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => restart()}
          >
            เริ่มใหม่
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => restart(randomSeed())}
          >
            สุ่ม seed ใหม่
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onExit}
            title="กด Esc เพื่อออก"
          >
            ออก <kbd className="bo-simulation-kbd">Esc</kbd>
          </button>
        </div>
      </div>

      {outdated && (
        <p className="bo-flow-warning" role="status">
          ร่างเปลี่ยนหลังเริ่มทดลอง ผลที่เห็นยังมาจากร่างเดิม{' '}
          <button
            type="button"
            className="bo-text-button"
            onClick={() => restart()}
          >
            เริ่มใหม่ด้วยร่างล่าสุด
          </button>
        </p>
      )}
      {!simulation.placed && (
        <p className="bo-flow-warning" role="status">
          เหตุการณ์นี้ยังไม่ได้วางบนกระดาน Flow ทดลองได้เฉพาะเหตุการณ์นี้
        </p>
      )}

      <div className="bo-simulation-scene">
        {summary ? (
          <EndingView
            summary={summary}
            portraitPath={playerPortraitPath(
              content.names,
              content.assets,
              save.nameId ?? '',
            )}
            program={playerProgram(
              content.faculties,
              content.majors,
              save.facultyId ?? null,
              save.majorId ?? null,
            )}
            onRestart={() => restart()}
          />
        ) : event ? (
          <SceneView
            key={`${event.id}-${simulation.seed}-${simulation.history.length}`}
            event={event}
            save={save}
            assets={content.assets}
            characters={content.characters}
            faculties={content.faculties}
            majors={content.majors}
            electives={content.electives}
            names={content.names}
            loanRatePercent={content.config.loan.annualRatePercent}
            recaps={getV2LastRecaps(content, save)}
            error={simulation.error}
            onChoose={(choiceId) => decide({ type: 'choice', choiceId })}
            onChooseMany={(choiceIds) => decide({ type: 'choices', choiceIds })}
            onChooseProgram={(facultyId, majorId) =>
              decide({ type: 'program', facultyId, majorId })
            }
            onChooseElective={(electiveId) =>
              decide({ type: 'elective', electiveId })
            }
            onHome={onExit}
            homeLabel="ออกจาก Simulation"
          />
        ) : (
          <p className="bo-error panel p-5" role="alert">
            {simulation.error ?? 'ไม่พบเหตุการณ์สำหรับทดลอง'}
          </p>
        )}
      </div>

      {simulation.history.length > 0 && (
        <section className="bo-simulation-history" aria-label="การตัดสินใจ">
          <h3 className="font-extrabold">การตัดสินใจ</h3>
          <ol>
            {simulation.history.map((entry, index) => {
              const before = index
                ? simulation.history[index - 1].save
                : simulation.start
              return (
                <li key={index}>
                  <div>
                    <small className="muted">
                      {formatGameTime(before.currentTime)} ·{' '}
                      {content.events.find((item) => item.id === entry.eventId)
                        ?.title ?? entry.eventId}
                    </small>
                    <span>{describeDecision(content, entry)}</span>
                  </div>
                  <button
                    type="button"
                    className="bo-text-button"
                    onClick={() =>
                      onChange(rewindSimulation(simulation, index))
                    }
                  >
                    เลือกใหม่
                  </button>
                  {entry.steps.length > 0 && (
                    <details className="bo-trace">
                      <summary className="muted text-xs">
                        เส้นทาง {entry.steps.length} ขั้น
                      </summary>
                      <ol>
                        {entry.steps.map((step, stepIndex) => {
                          const line = describeFlowStep(step, content)
                          return (
                            <li
                              key={stepIndex}
                              data-passed={
                                line.passed === undefined
                                  ? undefined
                                  : line.passed
                              }
                            >
                              <span>{line.text}</span>
                              {line.detail && <small>{line.detail}</small>}
                            </li>
                          )
                        })}
                      </ol>
                    </details>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <p className="muted text-xs">
        Flag ตอนนี้:{' '}
        {Object.entries(save.flags)
          .map(([flag, value]) => `${flag} = ${value ? 'จริง' : 'เท็จ'}`)
          .join(', ') || 'ยังไม่มี'}
      </p>
    </aside>
  )
}
