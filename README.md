# Roast & Roll ☕

**หน้าร้านกาแฟออนไลน์สำหรับเลือกสินค้า จัดการตะกร้า และติดตามคำสั่งซื้อ**

โปรเจกต์ Frontend สำหรับระบบร้านกาแฟ Roast & Roll พัฒนาด้วย Next.js และ React ปัจจุบันสามารถทดลองการใช้งานด้วย Mock data ได้ และเตรียมจุดเชื่อมต่อ Backend API ไว้แล้ว

<p align="center">
  <img src="public/Icon-Coffee-transparent.png" alt="Roast & Roll" width="180" />
</p>

## สมาชิกกลุ่ม

| สมาชิก | GitHub |
| --- | --- |
| Kanakorn W. | [@GKanakorn](https://github.com/GKanakorn) |
| Chatchadaporn C. | [@stamppppps](https://github.com/stamppppps) |
| Natthanan P. | — |
| Wilawan T. | [@BunnylucyN](https://github.com/BunnylucyN) |

## ฟีเจอร์

- ดูสินค้า ราคา น้ำหนักต่อชิ้น และจำนวนสินค้าคงเหลือ
- เพิ่มสินค้าและจัดการจำนวนสินค้าในตะกร้า
- ใช้คูปองและเลือกโซน/ความเร็วในการจัดส่ง
- จำลองขั้นตอนชำระเงินและดูสถานะคำสั่งซื้อ
- จัดการสินค้าและสถานะคูปองในหน้าผู้ดูแลระบบ
- รองรับหน้าจอหลายขนาด
- เลือกใช้ Mock data หรือเชื่อมต่อ Backend API ผ่าน environment variables

## เทคโนโลยี

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)
![License](https://img.shields.io/badge/license-Private-lightgrey)

## เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js รุ่นที่รองรับ Next.js 16
- pnpm

### ติดตั้งและเปิดเว็บ

```bash
pnpm install
pnpm dev
```

เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์

โดยค่าเริ่มต้นระบบใช้ Mock mode จึงสามารถทดลองหน้าเว็บได้โดยไม่ต้องเชื่อมต่อ Backend API

### บัญชีทดลองใน Mock mode

| บทบาท | Username | Password |
| --- | --- | --- |
| ลูกค้าทั่วไป | `cus_normal` | `123456` |
| ลูกค้า Prime | `cus_prime` | `123456` |
| ผู้ดูแลระบบ | `admin01` | `123456` |

## ตั้งค่า Backend API

สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์:

```env
NEXT_PUBLIC_API_MODE=api
NEXT_PUBLIC_AUTH_MODE=api
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

เปลี่ยน `NEXT_PUBLIC_API_BASE_URL` ให้ตรงกับ URL ของ Backend จากนั้นรีสตาร์ตเซิร์ฟเวอร์พัฒนา การเชื่อมต่อจะทำงานเมื่อ Backend ใช้ endpoint และรูปแบบ request/response ที่กำหนดไว้ใน `lib/store-api.ts` และ `lib/store-contract.ts`

## โครงสร้างโปรเจกต์

```text
app/          เส้นทางและ layout ของ Next.js
components/   หน้าร้าน ตะกร้า ชำระเงิน ออเดอร์ และหน้าผู้ดูแลระบบ
lib/          Mock store, API client, contracts และ business helpers
public/       โลโก้และ static assets
```

## คำสั่งที่มี

| คำสั่ง | รายละเอียด |
| --- | --- |
| `pnpm dev` | เปิดเซิร์ฟเวอร์พัฒนา |
| `pnpm build` | สร้าง production build |
| `pnpm start` | เปิด production server หลัง build |

---

<p align="center">Made with ☕ by the Roast & Roll team</p>
