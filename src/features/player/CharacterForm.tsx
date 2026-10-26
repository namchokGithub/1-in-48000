import { useRef, useState, type FormEvent } from 'react'
import type { Background } from '../../content/schema'

type Props = {
  backgrounds: Background[]
  hasPreviousSave: boolean
  onStart: (name: string, backgroundId: string) => void
  onCancel: () => void
}

export function CharacterForm({
  backgrounds,
  hasPreviousSave,
  onStart,
  onCancel,
}: Props) {
  const [name, setName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const [backgroundId, setBackgroundId] = useState(backgrounds[0].id)
  const [nameError, setNameError] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmReplace, setConfirmReplace] = useState(false)

  function randomize() {
    const random = crypto.getRandomValues(new Uint32Array(1))[0]
    setBackgroundId(backgrounds[random % backgrounds.length].id)
    setConfirmReplace(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('กรุณาตั้งชื่อก่อนเริ่มเกม')
      nameRef.current?.focus()
      return
    }
    setNameError('')
    if (hasPreviousSave && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    try {
      onStart(trimmed, backgroundId)
    } catch {
      setActionError(
        'เริ่มเกมไม่ได้ โปรดตรวจพื้นที่จัดเก็บของเบราว์เซอร์แล้วลองอีกครั้ง',
      )
    }
  }

  return (
    <section className="panel mx-auto max-w-4xl p-5 sm:p-8">
      <p className="eyebrow">สร้างตัวละคร</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        ชีวิตนี้เริ่มที่คุณ
      </h1>
      <p className="muted mt-2">
        ตั้งชื่อและเลือกพื้นฐานก่อนก้าวเข้าสู่ ม.บารพู
      </p>
      <form className="mt-7 space-y-7" onSubmit={submit} noValidate>
        <div>
          <label htmlFor="player-name" className="mb-2 block font-bold">
            ชื่อของคุณ
          </label>
          <input
            ref={nameRef}
            id="player-name"
            className="field"
            value={name}
            maxLength={30}
            autoComplete="off"
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'player-name-error' : undefined}
            onChange={(event) => {
              setName(event.target.value)
              setNameError('')
              setConfirmReplace(false)
            }}
            placeholder="เช่น ฟ้า"
          />
          {nameError && (
            <p
              id="player-name-error"
              className="mt-2 text-sm text-[var(--color-danger)]"
            >
              {nameError}
            </p>
          )}
        </div>
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
                data-selected={background.id === backgroundId}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="background"
                  value={background.id}
                  checked={background.id === backgroundId}
                  onChange={() => {
                    setBackgroundId(background.id)
                    setConfirmReplace(false)
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
              </label>
            ))}
          </div>
        </div>
        {confirmReplace && (
          <div
            className="rounded-xl border border-[#e1b5b7] bg-[#fff4f2] p-4"
            role="status"
          >
            <p className="font-bold">เซฟเดิมจะถูกแทนที่</p>
            <p className="mt-1 text-sm">
              ดาวน์โหลดเซฟสำรองจากหน้าแรกได้ก่อนเริ่มชีวิตใหม่
            </p>
          </div>
        )}
        {actionError && (
          <p className="text-sm text-[var(--color-danger)]" role="alert">
            {actionError}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button className="button button-primary" type="submit">
            {confirmReplace ? 'ยืนยันเริ่มชีวิตใหม่' : 'เริ่มชีวิตนี้'}
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
