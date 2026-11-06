import { useEffect, useRef } from 'react'
import { StatIcon } from './StatIcon'

export function PlayerGuideDialog({
  mascotPath,
  onClose,
}: {
  mascotPath?: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  function close() {
    ref.current?.close()
    onClose()
  }

  return (
    <dialog
      ref={ref}
      className="player-guide-dialog"
      aria-labelledby="player-guide-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="player-guide-content">
        <header className="player-guide-hero">
          <div className="player-guide-topline">
            <p className="eyebrow">คู่มือชีวิตที่ ม.บารพู</p>
            <button
              type="button"
              className="player-guide-close"
              aria-label="ปิดคู่มือเกม"
              autoFocus
              onClick={close}
            >
              ×
            </button>
          </div>
          <div className="player-guide-intro">
            <div className="player-guide-copy">
              <h2 id="player-guide-title">หนึ่งชีวิต หลายทางเลือก</h2>
              <p>
                จะเรียน จะเล่น หรือจะรอด?
                ทุกการตัดสินใจอาจเปลี่ยนทั้งวันนี้และวันเรียนจบ
              </p>
            </div>
            {mascotPath && (
              <img
                className="player-guide-mascot"
                src={mascotPath}
                alt="มาสคอตลิงของ ม.บารพู"
                width="96"
                height="171"
              />
            )}
          </div>
          <div className="player-guide-steps" aria-hidden="true">
            <span>เริ่มชีวิตใหม่</span>
            <span>ลองเลือกทาง</span>
            <span>ดูตอนจบ</span>
          </div>
        </header>

        <div className="player-guide-main">
          <div className="player-guide-grid">
            <article className="player-guide-card">
              <div className="player-guide-card-head">
                <span className="player-guide-icon">
                  <StatIcon stat="study" />
                </span>
                <span className="player-guide-number">01</span>
              </div>
              <h3>เริ่มจากพื้นฐาน</h3>
              <p>
                พื้นฐานชีวิต คณะ และสาขาที่อยากเรียน
                แต่ละพื้นฐานมีจุดเด่นและค่าสถานะเริ่มต้น
              </p>
            </article>

            <article className="player-guide-card">
              <div className="player-guide-card-head">
                <span className="player-guide-icon">
                  <StatIcon stat="relationships" />
                </span>
                <span className="player-guide-number">02</span>
              </div>
              <h3>เลือกทางของตัวเอง</h3>
              <p>
                เหตุการณ์ต่าง ๆ บางทางเลือกส่งผลทันที
                บางอย่างอาจกลับมาหาคุณในวันที่คาดไม่ถึง
              </p>
            </article>

            <article className="player-guide-card">
              <div className="player-guide-card-head">
                <span className="player-guide-icon">
                  <StatIcon stat="lucky" />
                </span>
                <span className="player-guide-number">03</span>
              </div>
              <h3>ไปให้ถึงตอนจบ</h3>
              <p>
                มีเรื่องราวมากมาย สุดท้ายแล้วชีวิตมหา'ลัยของคุณ
                จะจบลงแบบไหนกันนะ?
              </p>
            </article>
          </div>

          <aside
            className="player-guide-note"
            aria-label="รู้ไว้ก่อนเข้ามหา'ลัย"
          >
            <p className="player-guide-note-title">รู้ไว้ก่อนเข้ามหา'ลัย</p>
            <ul>
              <li>
                หลักสูตร 6 ปีคือ Hard Mode ต้องบริหารเงิน สุขภาพ
                และความเครียดให้อยู่รอดถึงวันเรียนจบ
              </li>
              {/* <li>รีเฟรชในแท็บเดิมเพื่อเล่นต่อได้ แต่กลับหน้าแรกจะจบรอบนั้น</li> */}
              <li>
                อยากปรับธีม เปิดเพลง หรือซ่อนค่าสถานะ? ตั้งค่าได้จากเมนูด้านบน
              </li>
            </ul>
          </aside>
          <div className="player-guide-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={close}
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
