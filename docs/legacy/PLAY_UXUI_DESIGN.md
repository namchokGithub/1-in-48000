# Play UX/UI

- หาบัคก่อน
  - เจออันนึงหน้า Play : บันทึกตัวเลือกไม่ได้ โปรดลองอีกครั้ง
  - ![1793343690302](../image/PLAY_UXUI_DESIGN/1793343690302.png) check ให้หน่อย
- เช็ค responsive for webview
- ทำ component UI แยกจาก BO
- ปรับ dropdown เป็น component กลาง ไม่ใช้ Native
- นำ Graphic Status จาก public/assets/status มาใช้
- เช็คเรื่องปุ่มหรือสี ว่าเข้ากันไหม
  - ![1793342776274](../image/PLAY_UXUI_DESIGN/1793342776274.png) ควร font white เหมือนปุ่มไหม ถ้า backgound มืด

## 1. Home

![1793342158902](../image/PLAY_UXUI_DESIGN/1793342158902.png)

![1793342735901](../image/PLAY_UXUI_DESIGN/1793342735901.png)

- เอา "เซฟของ ... " ออก จะเหลือเพียง "เริ่มเกม"
- กรอบทองข้างซ้าย เอา public/assets/pixel_campus_friends-in-bloom.png มาใส่

## 2. หน้าเลือกชีวิตเริ่มต้น

![1793342361812](../image/PLAY_UXUI_DESIGN/1793342361812.png)

- แสดงชื่อที่สุ่มไว้และ portrait มาแสดงเลย
- นำ Graphic Status จาก public/assets/status มาใช้ เช่น [study.png] การเรียน +4
- ![1793342834450](../image/PLAY_UXUI_DESIGN/1793342834450.png) ตอนกดเลือกมันมีขอบมา เอาขอบออกให้หน่อย

## 3. หน้าเกม: หน้าเลือกคณะและสาขา

![1793342981193](../image/PLAY_UXUI_DESIGN/1793342981193.png)

- ![1793342999888](../image/PLAY_UXUI_DESIGN/1793342999888.png) ส่วนรูปที่แสดง ภาพ scene มีขนาด 320 × 180 ปรับให้เหมาะสมหน่อย
- ![1793343077234](../image/PLAY_UXUI_DESIGN/1793343077234.png)ส่วนของ Player
  - ปรับรูปโปรไฟล์ในเต็ฒตัว
- ![1793343187956](../image/PLAY_UXUI_DESIGN/1793343187956.png)
  - เอา Graphic Status จาก public/assets/status มาใช้ เช่น [study.png] การเรียน
  - เอา เงินและหนี้ มาไว้ข้างล่างสุด เอาที่มีหลอดไปไว้ด้วยกัน
- ![1793343257072](../image/PLAY_UXUI_DESIGN/1793343257072.png)ปรับ dropdown เป็น component กลาง ไม่ใช้ Native
- ![1793343402455](../image/PLAY_UXUI_DESIGN/1793343402455.png)ควร font white เหมือนปุ่มไหม ถ้า backgound มืด

## 4. หน้าเกม: หน้าเล่นเกม

- ส่วนของ ปุ่ม, dropdown, รูป scene, profile, status ปรับเหมือนก่อนหน้า
- ![1793343560775](../image/PLAY_UXUI_DESIGN/1793343560775.png)![1793343796316](../image/PLAY_UXUI_DESIGN/1793343796316.png)ส่วนของตัวเลือก
  - เช็ค UI หน่อย layout ตัวเลือกและstatus เหมือนไม่ตรงกัน
    - ตัวเลือก ชิดซ้าย
    - status ชิดซ้าย
  - เอา Graphic Status จาก public/assets/status มาใช้ เช่น [study.png] การเรียน +2
- ![1793343942268](../image/PLAY_UXUI_DESIGN/1793343942268.png)![1793344050271](../image/PLAY_UXUI_DESIGN/1793344050271.png)![1793344365413](../image/PLAY_UXUI_DESIGN/1793344365413.png)
  - ถ้า choice ยาว ด้านซ้ายไม่ต้องยาวตามได้ไหม
- ![1793344061452](../image/PLAY_UXUI_DESIGN/1793344061452.png)
  - check box ทำ UI ให้เขากับระบบ และชิดซ้าย
  - แสดง status ด้วย ถ้าเลือกอะไรแล้ว +/- สถานะอะไร
- ![1793344255788](../image/PLAY_UXUI_DESIGN/1793344255788.png)
  - ปรับ dropdown เป็น component กลาง ไม่ใช้ Native
  - เอาปุ่มยืนยันไม่ข้างล่าง
- ![1793344365413](../image/PLAY_UXUI_DESIGN/1793344365413.png)
  - เอา scroll bar ของตัวเลือกออก แต่ยัง scroll ได้

## 5. บทสรุปชีวิต

![1793344516715](../image/PLAY_UXUI_DESIGN/1793344516715.png)

- แยก เส้นทางชีวิตของคุณ ออกมาอีกการ์ดด้านล่าง
- เอาปุ่ม เริ่มใหม่ ไว้การ์ดแรก
- เอาปุ่มหน้าแรกออก
- การ์ด เส้นทางชีวิตของคุณ
  - ย่อขยายได้
  - แยกตามปี
  - ปรับเส้น timeline ให้ดูง่ายๆ
