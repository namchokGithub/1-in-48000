import type { V2Content } from '../../content/v2/schema'
import { periodLabels } from './periodLabels'

type Config = V2Content['config']
type Period = keyof Config['loan']['periodDays']

const periods: Period[] = ['term1', 'break', 'term2', 'summer']

export function GameSettingsEditor({
  config,
  onChange,
}: {
  config: Config
  onChange: (next: Config) => void
}) {
  const { loan } = config
  const totalDays = periods.reduce(
    (sum, period) => sum + loan.periodDays[period],
    0,
  )
  const rateValid = loan.annualRatePercent >= 0 && loan.annualRatePercent <= 100
  const setLoan = (next: Config['loan']) => onChange({ ...config, loan: next })

  return (
    <section className="panel bo-editor mt-3" aria-label="ตั้งค่าเกม">
      <div className="bo-section-heading">
        <h2 className="font-extrabold">ตั้งค่าเกม</h2>
      </div>
      <div className="bo-editor-section bo-stack">
        <h3>การกู้อัตโนมัติ</h3>
        <p className="muted text-sm">
          เงินติดลบได้ ยอดที่ติดลบคือยอดกู้
          ทุกครั้งที่ผ่านช่วงเวลาจะหักดอกเบี้ยจากเงิน ตามสูตร ยอดกู้ × อัตรา ×
          จำนวนวันของช่วงที่จบ ÷ 36,500 (ปัดเป็นบาท)
          หนี้ที่ผู้เขียนตั้งไม่มีดอกเบี้ย และตอนจบระบบหักหนี้จากเงิน
        </p>
        <label className="bo-field bo-medium-field">
          <span>อัตราดอกเบี้ยต่อปี (%)</span>
          <input
            className="field"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={loan.annualRatePercent}
            aria-invalid={!rateValid}
            onChange={(input) =>
              setLoan({
                ...loan,
                annualRatePercent: input.target.valueAsNumber,
              })
            }
          />
          {!rateValid && <small className="bo-field-error">ใส่ 0–100</small>}
        </label>
        <fieldset className="bo-stack">
          <legend className="font-bold">
            จำนวนวันต่อช่วง (รวม {totalDays} วัน)
          </legend>
          <div className="bo-form-grid">
            {periods.map((period) => {
              const days = loan.periodDays[period]
              const valid = Number.isInteger(days) && days >= 0
              return (
                <label key={period} className="bo-field">
                  <span>{periodLabels[period]}</span>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    step={1}
                    value={days}
                    aria-invalid={!valid}
                    onChange={(input) =>
                      setLoan({
                        ...loan,
                        periodDays: {
                          ...loan.periodDays,
                          [period]: input.target.valueAsNumber,
                        },
                      })
                    }
                  />
                  {!valid && (
                    <small className="bo-field-error">
                      ใส่จำนวนเต็มตั้งแต่ 0
                    </small>
                  )}
                </label>
              )
            })}
          </div>
        </fieldset>
      </div>
    </section>
  )
}
