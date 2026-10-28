import { useState, type FormEvent } from 'react'
import type { V2Content } from '../../content/v2/schema'
import { pickV2StartOption } from '../../engine/v2/game'
import { formatStatChange } from './choicePreview'

type Props = {
  backgrounds: V2Content['config']['backgrounds']
  onStart: (backgroundId: string) => void
  onCancel: () => void
}

export function CharacterForm({ backgrounds, onStart, onCancel }: Props) {
  const [backgroundId, setBackgroundId] = useState(backgrounds[0].id)
  const [randomBackground, setRandomBackground] = useState(false)
  const [actionError, setActionError] = useState('')

  function randomize() {
    const random = crypto.getRandomValues(new Uint32Array(1))[0]
    setBackgroundId(pickV2StartOption(backgrounds, random).id)
    setRandomBackground(true)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onStart(backgroundId)
    } catch {
      setActionError(
        'เริ่มเกมไม่ได้ โปรดตรวจพื้นที่จัดเก็บของเบราว์เซอร์แล้วลองอีกครั้ง',
      )
    }
  }

  return (
    <section className="panel w-full p-5 sm:p-8 lg:p-10">
      <p className="eyebrow">สร้างตัวละคร</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        ชีวิตนี้เริ่มที่คุณ
      </h1>
      <p className="muted mt-2">
        ชื่อจะสุ่มเมื่อเริ่มเกม เลือกพื้นฐานก่อนก้าวเข้าสู่ ม.บารพู
      </p>
      <form className="mt-7 space-y-7" onSubmit={submit} noValidate>
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">พื้นฐานตัวละคร</h2>
              <p className="muted text-sm">แต่ละแบบส่งผลต่อค่าสถานะเริ่มต้น</p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={randomize}
            >
              สุ่มพื้นฐาน
            </button>
          </div>
          <div
            className="grid gap-3 md:grid-cols-3"
            role="group"
            aria-label="เลือกพื้นฐานตัวละคร"
          >
            {backgrounds.map((background) => (
              <label
                key={background.id}
                className="background-card"
                data-selected={
                  !randomBackground && background.id === backgroundId
                }
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="background"
                  value={background.id}
                  checked={!randomBackground && background.id === backgroundId}
                  onChange={() => {
                    setBackgroundId(background.id)
                    setRandomBackground(false)
                  }}
                />
                <span className="block text-lg font-extrabold">
                  {background.title}
                </span>
                <span className="muted mt-3 block text-sm">
                  ครอบครัว: {background.family}
                </span>
                <span className="muted block text-sm">
                  นิสัย: {background.personality}
                </span>
                <span className="muted block text-sm">
                  ทักษะ: {background.skill}
                </span>
                <span className="mt-3 block text-sm font-semibold">
                  {Object.entries(background.statDeltas)
                    .filter(([, amount]) => amount !== 0)
                    .map(([stat, amount]) =>
                      formatStatChange(
                        stat as keyof typeof background.statDeltas,
                        amount,
                      ),
                    )
                    .join(' · ') || 'ค่าสถานะเริ่มต้นไม่เปลี่ยน'}
                </span>
              </label>
            ))}
          </div>
          {randomBackground && (
            <p className="muted mt-3 text-sm" role="status">
              สุ่มพื้นฐานไว้แล้ว จะรู้ว่าได้แบบไหนหลังเริ่มชีวิตนี้
            </p>
          )}
        </div>
        {actionError && (
          <p className="text-sm text-[var(--color-danger)]" role="alert">
            {actionError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <button className="button button-primary" type="submit">
            เริ่มชีวิตนี้
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={onCancel}
          >
            กลับหน้าแรก
          </button>
        </div>
      </form>
    </section>
  )
}
