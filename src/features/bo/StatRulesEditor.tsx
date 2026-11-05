import type { V2Content } from '../../content/v2/schema'
import { NumberInput } from './NumberInput'
import { periodLabels } from './periodLabels'
import { BoDropdown } from './Select'
import { conditionSummary } from './storySummary'
import { statLabel, v2StatOptions } from './v2StatOptions'

type Config = V2Content['config']
type Modifier = Config['statModifiers'][number]
type StatEnding = Config['statEndings'][number]
type PeriodChange = Config['periodChanges'][number]
type Period = PeriodChange['periods'][number]

const allPeriods = Object.keys(periodLabels) as Period[]
type When = Modifier['when']

const operators: { id: When['operator']; label: string }[] = [
  { id: 'lt', label: 'น้อยกว่า' },
  { id: 'lte', label: 'ไม่เกิน' },
  { id: 'eq', label: 'เท่ากับ' },
  { id: 'gte', label: 'อย่างน้อย' },
  { id: 'gt', label: 'มากกว่า' },
]

const appliesLabels: Record<Modifier['applies'], string> = {
  gains: 'เฉพาะผลบวก',
  losses: 'เฉพาะผลลบ',
  both: 'ทั้งบวกและลบ',
}

function WhenFields({
  value,
  onChange,
}: {
  value: When
  onChange: (next: When) => void
}) {
  return (
    <>
      <span className="muted">เมื่อ</span>
      <BoDropdown
        label="ค่าสถานะของเงื่อนไข"
        value={value.stat}
        onChange={(event) =>
          onChange({ ...value, stat: event.target.value as When['stat'] })
        }
      >
        {v2StatOptions.map((stat) => (
          <option key={stat.id} value={stat.id}>
            {stat.label}
          </option>
        ))}
      </BoDropdown>
      <BoDropdown
        label="การเปรียบเทียบ"
        value={value.operator}
        onChange={(event) =>
          onChange({
            ...value,
            operator: event.target.value as When['operator'],
          })
        }
      >
        {operators.map((operator) => (
          <option key={operator.id} value={operator.id}>
            {operator.label}
          </option>
        ))}
      </BoDropdown>
      <NumberInput
        className="field bo-short-field"
        integer
        aria-label="ค่าในเงื่อนไข"
        value={value.value}
        onValueChange={(next) => onChange({ ...value, value: next })}
      />
    </>
  )
}

/** Stat modifier and stat ending rules in the game settings. */
export function StatRulesEditor({
  config,
  endings,
  onChange,
}: {
  config: Config
  endings: V2Content['endings']
  onChange: (next: Config) => void
}) {
  const modifiers = config.statModifiers
  const statEndings = config.statEndings
  const periodChanges = config.periodChanges
  const setPeriodChanges = (next: PeriodChange[]) =>
    onChange({ ...config, periodChanges: next })
  const updatePeriodChange = (index: number, next: PeriodChange) =>
    setPeriodChanges(
      periodChanges.map((item, at) => (at === index ? next : item)),
    )
  const setModifiers = (next: Modifier[]) =>
    onChange({ ...config, statModifiers: next })
  const setEndings = (next: StatEnding[]) =>
    onChange({ ...config, statEndings: next })
  const updateModifier = (index: number, next: Modifier) =>
    setModifiers(modifiers.map((item, at) => (at === index ? next : item)))
  const updateEnding = (index: number, next: StatEnding) =>
    setEndings(statEndings.map((item, at) => (at === index ? next : item)))
  const moveEnding = (index: number, by: -1 | 1) => {
    const next = [...statEndings]
    ;[next[index], next[index + by]] = [next[index + by], next[index]]
    setEndings(next)
  }
  const endingIds = new Set(endings.map((ending) => ending.id))

  return (
    <>
      <div className="bo-editor-section bo-stack mb-2">
        <h3>เปลี่ยนทุกช่วงเวลา</h3>
        <p className="muted text-sm">
          ทุกครั้งที่ผ่าน Next Period ระบบเปลี่ยนค่าตามกฎของช่วงที่เพิ่งจบ
          หลังหักดอกเบี้ยและก่อนผลภายหลังของช่วงใหม่ เช่น การเรียน −2 ทุกช่วง
          ("ลืม") ค่านี้ไม่ผ่านกฎปรับผล % ผู้เล่นเห็นผลในแถบสถานะและสรุปรายปี
          แต่ไม่ขึ้นในข้อความหลังเลือก
        </p>
        {periodChanges.map((rule, index) => (
          <div key={index} className="bo-condition-row bo-stat-rule">
            <div className="bo-condition-sentence">
              <BoDropdown
                label="ค่าสถานะที่เปลี่ยน"
                value={rule.stat}
                onChange={(event) =>
                  updatePeriodChange(index, {
                    ...rule,
                    stat: event.target.value as PeriodChange['stat'],
                  })
                }
              >
                {v2StatOptions.map((stat) => (
                  <option key={stat.id} value={stat.id}>
                    {stat.label}
                  </option>
                ))}
              </BoDropdown>
              <NumberInput
                className="field bo-short-field"
                integer
                aria-label="เปลี่ยนเท่าไร"
                value={rule.amount}
                onValueChange={(amount) =>
                  updatePeriodChange(index, { ...rule, amount })
                }
              />
              <span className="muted">เมื่อจบ</span>
              {allPeriods.map((period) => (
                <label key={period} className="bo-checkbox-field">
                  <input
                    type="checkbox"
                    checked={rule.periods.includes(period)}
                    disabled={
                      rule.periods.length === 1 && rule.periods[0] === period
                    }
                    onChange={(event) =>
                      updatePeriodChange(index, {
                        ...rule,
                        periods: allPeriods.filter((item) =>
                          item === period
                            ? event.target.checked
                            : rule.periods.includes(item),
                        ),
                      })
                    }
                  />
                  <span>{periodLabels[period]}</span>
                </label>
              ))}
              <label className="bo-checkbox-field">
                <input
                  type="checkbox"
                  checked={!!rule.when}
                  onChange={(event) => {
                    const { when: _when, ...always } = rule
                    void _when
                    updatePeriodChange(
                      index,
                      event.target.checked
                        ? {
                            ...rule,
                            when: {
                              type: 'stat',
                              stat: 'stress',
                              operator: 'gte',
                              value: 70,
                            },
                          }
                        : always,
                    )
                  }}
                />
                <span>มีเงื่อนไข</span>
              </label>
              {rule.when && (
                <WhenFields
                  value={rule.when}
                  onChange={(when) =>
                    updatePeriodChange(index, { ...rule, when })
                  }
                />
              )}
            </div>
            <button
              type="button"
              className="bo-text-button bo-danger"
              aria-label={`ลบกฎ ${statLabel(rule.stat)} ${rule.amount}`}
              onClick={() =>
                setPeriodChanges(periodChanges.filter((_, at) => at !== index))
              }
            >
              ลบ
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button-secondary bo-add-at-end"
          onClick={() =>
            setPeriodChanges([
              ...periodChanges,
              { stat: 'study', amount: -2, periods: [...allPeriods] },
            ])
          }
        >
          + เพิ่มกฎเปลี่ยนทุกช่วง
        </button>
      </div>

      <div className="bo-editor-section bo-stack mb-2">
        <h3>กฎปรับผลตามค่าสถานะ</h3>
        <p className="muted text-sm">
          ขณะที่เงื่อนไขเป็นจริง ผลต่อค่าสถานะเป้าหมายจะเพิ่มหรือลดตาม % เช่น
          สุขภาพน้อยกว่า 60 · การเรียน −20% ทำให้ +10 เหลือ +8
          ระบบตัดสินจากค่าก่อนผู้เล่นเลือก หลายกฎรวม % กัน ลดได้ไม่เกิน −100%
          และปัดเป็นจำนวนเต็ม ตัวเลขใต้ตัวเลือกใน Player แสดงค่าหลังปรับแล้ว
        </p>
        {modifiers.map((rule, index) => {
          const percentValid =
            Number.isInteger(rule.percent) &&
            rule.percent >= -100 &&
            rule.percent <= 500
          return (
            <div key={index} className="bo-condition-row bo-stat-rule">
              <div className="bo-condition-sentence">
                <WhenFields
                  value={rule.when}
                  onChange={(when) => updateModifier(index, { ...rule, when })}
                />
                <span className="muted">ผลต่อ</span>
                <BoDropdown
                  label="ค่าสถานะที่ถูกปรับ"
                  value={rule.target}
                  onChange={(event) =>
                    updateModifier(index, {
                      ...rule,
                      target: event.target.value as Modifier['target'],
                    })
                  }
                >
                  {v2StatOptions.map((stat) => (
                    <option key={stat.id} value={stat.id}>
                      {stat.label}
                    </option>
                  ))}
                </BoDropdown>
                <NumberInput
                  className="field bo-short-field"
                  integer
                  min={-100}
                  max={500}
                  aria-label="ปรับ %"
                  aria-invalid={!percentValid}
                  value={rule.percent}
                  onValueChange={(percent) =>
                    updateModifier(index, { ...rule, percent })
                  }
                />
                <span className="muted">%</span>
                <BoDropdown
                  label="ใช้กับผลแบบไหน"
                  value={rule.applies}
                  onChange={(event) =>
                    updateModifier(index, {
                      ...rule,
                      applies: event.target.value as Modifier['applies'],
                    })
                  }
                >
                  {Object.entries(appliesLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </BoDropdown>
                {!percentValid && (
                  <small className="bo-field-error">ใส่ −100 ถึง 500</small>
                )}
              </div>
              <button
                type="button"
                className="bo-text-button bo-danger"
                aria-label={`ลบกฎ ${conditionSummary(rule.when)} → ${statLabel(rule.target)}`}
                onClick={() =>
                  setModifiers(modifiers.filter((_, at) => at !== index))
                }
              >
                ลบ
              </button>
            </div>
          )
        })}
        <button
          type="button"
          className="button button-secondary bo-add-at-end"
          onClick={() =>
            setModifiers([
              ...modifiers,
              {
                when: {
                  type: 'stat',
                  stat: 'health',
                  operator: 'lt',
                  value: 60,
                },
                target: 'study',
                percent: -20,
                applies: 'gains',
              },
            ])
          }
        >
          + เพิ่มกฎปรับผล
        </button>
      </div>

      <div className="bo-editor-section bo-stack">
        <h3>กฎจบเกมตามค่าสถานะ</h3>
        <p className="muted text-sm">
          ระบบตรวจหลังทุกการเลือกและหลังเปลี่ยนช่วงเวลา ถ้าเงื่อนไขเป็นจริง
          เกมจะไปฉากจบนั้นทันที ก่อนการตรวจผลการเรียน ถ้าตรงหลายกฎ
          ใช้กฎที่อยู่บนสุด
        </p>
        {statEndings.map((rule, index) => (
          <div key={index} className="bo-condition-row bo-stat-rule">
            <div className="bo-condition-sentence">
              <WhenFields
                value={rule.when}
                onChange={(when) => updateEnding(index, { ...rule, when })}
              />
              <span className="muted">จบที่</span>
              <BoDropdown
                label="ฉากจบ"
                value={rule.endingId}
                onChange={(event) =>
                  updateEnding(index, { ...rule, endingId: event.target.value })
                }
              >
                {!endingIds.has(rule.endingId) && (
                  <option value={rule.endingId}>{rule.endingId} (ไม่พบ)</option>
                )}
                {endings.map((ending) => (
                  <option key={ending.id} value={ending.id}>
                    {ending.title}
                  </option>
                ))}
              </BoDropdown>
              {!endingIds.has(rule.endingId) && (
                <small className="bo-field-error">ไม่พบฉากจบนี้</small>
              )}
            </div>
            <div className="bo-stat-rule-actions">
              <button
                type="button"
                className="bo-text-button"
                aria-label="เลื่อนกฎขึ้น"
                disabled={index === 0}
                onClick={() => moveEnding(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="bo-text-button"
                aria-label="เลื่อนกฎลง"
                disabled={index === statEndings.length - 1}
                onClick={() => moveEnding(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="bo-text-button bo-danger"
                aria-label={`ลบกฎจบเกม ${conditionSummary(rule.when)}`}
                onClick={() =>
                  setEndings(statEndings.filter((_, at) => at !== index))
                }
              >
                ลบ
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="button button-secondary bo-add-at-end"
          disabled={!endings.length}
          onClick={() =>
            setEndings([
              ...statEndings,
              {
                when: {
                  type: 'stat',
                  stat: 'health',
                  operator: 'lt',
                  value: 1,
                },
                endingId:
                  endings.find((ending) => ending.id === 'burnout')?.id ??
                  endings[0].id,
              },
            ])
          }
        >
          + เพิ่มกฎจบเกม
        </button>
      </div>
    </>
  )
}
