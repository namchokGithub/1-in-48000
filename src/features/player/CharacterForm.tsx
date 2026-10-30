import { useState, type FormEvent } from 'react'
import type { V2Content } from '../../content/v2/schema'
import { pickV2StartOption, previewV2Name } from '../../engine/v2/game'
import { formatStatChange } from './choicePreview'
import { playerPortraitPath } from './playerIdentity'
import { EffectList } from './ui/EffectList'

type Props = {
  backgrounds: V2Content['config']['backgrounds']
  names: V2Content['names']
  assets: V2Content['assets']
  onStart: (seed: number, backgroundId: string) => void
  onCancel: () => void
}

export function CharacterForm({
  backgrounds,
  names,
  assets,
  onStart,
  onCancel,
}: Props) {
  // The game seed is rolled here so the name shown is the name the game uses.
  const [seed] = useState(() => crypto.getRandomValues(new Uint32Array(1))[0])
  const name = previewV2Name({ names }, seed)
  const portraitPath = playerPortraitPath(names, assets, name.id, 'casual')
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
      onStart(seed, backgroundId)
    } catch {
      setActionError(
        'เริ่มเกมไม่ได้ โปรดตรวจพื้นที่จัดเก็บของเบราว์เซอร์แล้วลองอีกครั้ง',
      )
    }
  }

  return (
    <section className="panel w-full p-5 sm:p-8 lg:p-10">
      <div className="player-create-header">
        <div>
          <p className="eyebrow">สร้างตัวละคร</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            ชีวิตนี้เริ่มที่คุณ
          </h1>
          <p className="muted mt-2">เลือกพื้นฐานก่อนก้าวเข้าสู่ ม.บารพู</p>
        </div>
        <div className="player-create-identity">
          {portraitPath ? (
            <img
              className="player-identity-portrait"
              src={portraitPath}
              alt={`ภาพผู้เล่น ${name.name}`}
            />
          ) : (
            <span
              className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-2xl"
              aria-hidden="true"
            >
              {name.name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="eyebrow">ชื่อของคุณ</p>
            <p className="truncate text-2xl font-extrabold">{name.name}</p>
          </div>
        </div>
      </div>
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
                {Object.values(background.statDeltas).some(Boolean) ? (
                  <EffectList
                    className="mt-3"
                    lines={Object.entries(background.statDeltas)
                      .filter(([, amount]) => amount !== 0)
                      .map(([key, amount]) => {
                        const stat = key as keyof typeof background.statDeltas
                        return { stat, text: formatStatChange(stat, amount) }
                      })}
                  />
                ) : (
                  <span className="mt-3 block text-sm">
                    ค่าสถานะเริ่มต้นไม่เปลี่ยน
                  </span>
                )}
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
