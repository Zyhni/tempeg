# TEMPEG — Temporary Email Generator (Next.js)

**Tempeg** adalah aplikasi Temporary Email Generator berbasis **Next.js**.  
Aplikasi ini membuat alamat email sementara, menampilkan inbox (menggunakan API provider), menyimpan history per-device, dan punya fitur polling untuk cek pesan masuk.

---

## Fitur Utama
- Generate temporary email via API proxy (`/api/tempmail`) — **API key aman** di server.
- Check inbox via proxy (`/api/inbox?id=...`) yang memanggil endpoint provider.
- UI tema **gothic merah-hitam** (custom CSS, tidak memakai Tailwind).
- **Cooldown 10 detik** pada tombol *Generate Email* (visual countdown: `Waiting 10s...`) untuk mencegah spam dari sisi client. Cooldown bertahan walau halaman di-refresh (disimpan di `localStorage`).
- **History per device**: history disimpan di `localStorage` dan distandarisasi per device (`tempeg-history-[DEVICE_ID]`).
- **Sanitization** sederhana untuk mencegah XSS pada tampilan (escape `<`, `>`, `"` dan `'`).
- Auto-polling inbox (toggle), copy-to-clipboard, dan tampilan pesan rapi.

---

## Struktur Project
```js
tempeg/
├─ pages/
│ ├─ index.jsx # UI + logic (generate, inbox, cooldown, history)
│ └─ api/
│ ├─ tempmail.js # server proxy untuk generate tempmail
│ └─ inbox.js # server proxy untuk mailbox
├─ public/
├─ styles/
│ └─ globals.css # custom gothic CSS
├─ package.json
├─ next.config.js
└─ README.md
```

---

## Quickstart (lokal)

1. Clone repo:
```bash
git clone https://github.com/username/tempeg.git
cd tempeg
```
2. Install dependensi:
```bash
npm install
```
3. Buat .env.local untuk development:
```bash
TEMPEG_APIKEY=
NEXT_PUBLIC_PROJECT_NAME=
```
4. Jalankan development:
```bash
npm run dev
```

## Lisensi
MIT © 2026
