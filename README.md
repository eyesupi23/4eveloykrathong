# ลอยกระทง 8-bit

มินิเกมลอยกระทงออนไลน์ สไตล์ 8-bit — React + TypeScript + Tailwind CSS v4 + Vite

## วิธีรัน

```bash
yarn
yarn dev      # เปิด http://localhost:5173
yarn build    # build สำหรับ deploy (ไฟล์อยู่ใน dist/)
```

## ฟีเจอร์

- ฉากคืนวันเพ็ญแบบพิกเซล: ดาวกะพริบ พระจันทร์เต็มดวง เงาจันทร์ในน้ำ โคมลอย และวัดริมฝั่ง
- พลุ 8-bit ยิงเป็นระยะ และยิงชุดใหญ่ตอนลอยกระทง (มีเงาสะท้อนในน้ำ)
- สร้างกระทง: เลือกฐาน (ใบตอง / ขนมปัง / หยวกกล้วย) และดอกไม้ (ดาวเรือง / กุหลาบ / กล้วยไม้ / ดอกบัว)
- อัปโหลดรูปปักบนกระทง รูปจะถูกแปลงเป็นภาพพิกเซลแบบเบาๆ 32×32 อัตโนมัติ
- เขียนคำอธิษฐานสั้นๆ (ไม่เกิน 40 ตัวอักษร) และใส่ชื่อได้
- แตะหรือชี้ที่กระทงเพื่ออ่านคำอธิษฐาน
- กระทงของคุณถูกจำไว้ใน localStorage และวนกลับมาลอยอีกเมื่อเปิดหน้าใหม่

## โครงสร้าง

```
src/
  App.tsx                       หน้าหลัก + จัดการกระทงในแม่น้ำ
  lib/scene.ts                  วาดฉากกลางคืน + พลุบน canvas ความละเอียดต่ำ
  lib/sprite.ts                 วาดกระทงเป็น pixel art (2 เฟรมให้เปลวเทียนไหว)
  lib/pixelate.ts               แปลงรูปที่อัปโหลดเป็นพิกเซล
  lib/data.ts                   ตัวเลือกฐาน ดอกไม้ และคำอธิษฐานตัวอย่าง
  lib/storage.ts                บันทึกกระทงของผู้ใช้
  components/SkyScene.tsx       canvas ฉากหลัง
  components/FloatingKrathong.tsx  กระทงที่ลอยในแม่น้ำ
  components/KrathongSprite.tsx    แสดง sprite กระทง
  components/Builder.tsx        หน้าต่างสร้างกระทง
```

## เชื่อม Supabase (ให้ทุกคนเห็นกระทงของกันและกัน)

1. สร้างโปรเจคที่ supabase.com (region: Asia-Pacific)
2. SQL Editor → วางไฟล์ `supabase/schema.sql` ทั้งไฟล์ → Run
3. ใส่ค่าใน `.env.local` (ไฟล์นี้ไม่ขึ้น git)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=คีย์ publishable / anon public (ห้ามใช้ service_role)
```

4. ตอน deploy (Vercel / Netlify) ใส่ 2 ค่านี้ใน Environment Variables ของเว็บด้วย

ถ้าไม่ได้ใส่ค่า เว็บจะทำงานแบบออฟไลน์ (เห็นเฉพาะกระทงของตัวเอง)
