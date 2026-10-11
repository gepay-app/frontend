# TODO — Frontend: Dashboard Saldo, Donasi, Halaman Donatur, Overlay

> Rencana implementasi bertahap untuk fitur donasi/overlay di frontend GePay.
> Sumber kontrak: backend `donation` + `payment` (Swagger `http://localhost:8080/swagger-ui/index.html`).
> Aturan penulisan kode tetap mengikuti [`AGENTS.md`](./AGENTS.md) (wajib dibaca ulang sebelum mulai).
>
> **Prinsip kerja**
> 1. Satu fase = satu perubahan kecil yang wajib `bun run build` hijau sebelum lanjut.
> 2. **Hanya frontend.** Jangan sentuh `../backend`. Kalau ada kebutuhan backend yang belum
>    tersedia, laporkan ke user (jangan asumsikan kontrak).
> 3. Semua HTTP lewat `useApi`. Jangan `$fetch`/`EventSource`/`WebSocket` ad-hoc di luar util.
> 4. Branching error pakai `ApiError.code`, bukan `message`.
> 5. Uang selalu angka bulat rupiah dari backend; frontend **tidak** jadi sumber angka uang.
> 6. Warna wajib token semantik Nuxt UI; ikon `i-lucide-*`; teks/komentar bahasa Indonesia.

---

## 1. Ringkasan fitur yang diminta

| # | Fitur | Route (usulan) | Auth | Sumber data utama |
|---|---|---|---|---|
| F1 | Dashboard ringkasan saldo | `/dashboard` (edit) | login | `GET /balance`, `GET /donations/me`, `GET /payments` |
| F2 | Daftar donasi creator (pesan donatur) | `/dashboard/donations` | login + `CREATOR` | `GET /donations/me?cursor=&size=` |
| F3 | Kelola halaman donasi + overlay key | `/dashboard/donation-page` | login + `CREATOR` | `GET/PUT /donations/me/page`, `POST .../overlay-key/rotate` |
| F4 | Halaman donasi publik (donor bayar) | `/donate/[slug]` | publik | `GET /donation-pages/{slug}`, `GET /channels/payin`, `POST /donations`, `GET /donations/{id}` (+ SSE) |
| F5 | Overlay display (OBS) | `/overlay/[key]` | publik (overlay key) | WS `/ws/overlay/display?key=` |
| F6 | Overlay controller | `/dashboard/overlay` | login + `CREATOR` | WS `/ws/overlay/control?token=`, `GET /donations/overlay/queue` |

**Semua endpoint yang dibutuhkan sudah tersedia di backend** (diverifikasi via Swagger +
source): channel ber-fee lewat `GET /channels/payin` & `/channels/payout`, dan display overlay
menerima sinyal `skip`/`paused`/`resumed`. Detail di §8.

---

## 2. Kontrak API (rujukan cepat — sudah diverifikasi dari source backend)

### 2.1 Saldo
`GET /api/v1/balance` → `BalanceRes`
```
{ pending, available, withdrawalPayable, currency }
```
- `pending` = dana sudah dibayar tapi belum settle (belum bisa ditarik).
- `available` = saldo siap tarik.
- `withdrawalPayable` = saldo yang **ditahan** karena penarikan sedang berjalan
  (double-entry ledger: hold J-5). Ini yang diminta user sebagai "balance yang ditahan".

### 2.2 Channel (dipisah PAYIN vs PAYOUT)
Backend **sudah menyediakan** endpoint di bawah. Kontraknya:

- **PAYIN (publik, tanpa auth)** — donor melihat metode bayar **beserta fee-nya**.
  ```
  GET /api/v1/channels/payin?amount=<long, opsional>
  data: [{
    id, code, displayName, type, direction:"PAYIN",
    minAmount, maxAmount,
    pgFeeAmount,          // fee PG (ditanggung donor) — null kalau amount tak dikirim
    totalChargedAmount,   // amount + pgFeeAmount — null kalau amount tak dikirim
    currency
  }]
  ```
  - Fee **per channel** (karena tiap channel = route/payment attempt berbeda).
  - **JANGAN** expose `platformFeeAmount`/`netCreatorAmount` (itu bagian creator, sembunyikan).
- **PAYOUT (wajib auth)** — karena fee bisa terpengaruh `UserFeeOverride` (creator VIP).
  ```
  GET /api/v1/channels/payout      (Bearer)
  data: [{ id, code, displayName, type, direction:"PAYOUT",
           minAmount, maxAmount, withdrawalFeeAmount, feePercentageBps, currency }]
  ```
- `GET /api/v1/channels?direction=` lama → **deprecated**; frontend migrasi ke dua endpoint di atas.

### 2.3 Halaman donasi
- `GET /api/v1/donation-pages/{slug}` (publik) → `PublicDonationPage`
  ```
  { id, creatorId, slug, displayName, title, description, imageUrl, active, createdAt }
  ```
  404 `donation.page_not_found` kalau slug tidak ada.
- `GET /api/v1/donations/me/page` (auth) → `DonationPage` (auto-create, **ada `overlayKey` + `updatedAt`**)
- `PUT /api/v1/donations/me/page` (auth) body `{ displayName?, title?, description?, imageUrl?, slug? }`
  → `DonationPage`. `slug` null = tidak berubah; `409` kalau slug dipakai.
- `POST /api/v1/donations/me/page/overlay-key/rotate` (auth) → `{ overlayKey }`

### 2.4 Donasi
- `POST /api/v1/donations` (publik) body:
  ```json
  {
    "idempotencyKey": "uuid",
    "creatorId": "uuid",
    "amount": 50000,
    "donorName": "Budi",
    "donorEmail": "a@b.com",
    "channelCode": "VA_BCA",
    "type": "TEXT" | "YOUTUBE",
    "message": "semangat!",
    "videoUrl": "https://youtu.be/...",
    "isAnonymous": false
  }
  ```
  → `DonationRes`
  ```
  { donationId, creatorId, status, type, amount, totalChargedAmount, channelCode,
    message, videoId, paymentReferenceNumber, paymentExpiresAt, createdAt, paidAt }
  ```
  - `paymentReferenceNumber` = instruksi bayar (no. VA / QR string / URL) — **tampilkan ini**.
  - `totalChargedAmount` = amount + fee PG (yang benar-benar dibayar donor).
  - Validasi backend (service, bukan bean validation) → `ValidationException`:
    envelope `code:"validation.failed"`, `errors:[{field,message}]`. Field: `type`, `message`, `videoUrl`.
    Aturan: `TEXT` wajib `message` ≤350 char & tanpa `videoUrl`; `YOUTUBE` wajib URL YouTube valid (11 char id).
- `GET /api/v1/donations/{id}` (publik) → `DonationRes` (sumber kebenaran status).
- `GET /api/v1/donations/{id}/stream` (publik) → SSE, event name `paid`, data `"paid"`.
  Boleh putus; fallback polling `GET /donations/{id}` tiap 2–3s. SSE bukan sumber kebenaran.
- `GET /api/v1/donations/me?cursor=&size=` (auth) → `CursorPage<CreatorDonation>`
  ```
  items: [{ donationId, status, type, amount, totalChargedAmount, donorName, donorEmail,
            isAnonymous, message, videoId, channelCode, createdAt, paidAt }]
  nextCursor: string|null, hasNext: boolean
  ```
  `cursor` bertipe UUID; ambil halaman berikut dengan `?cursor=<nextCursor>`.

### 2.5 Overlay
WebSocket (bukan STOMP; pakai `WebSocket` native), envelope:
```json
{ "v": 1, "type": "...", "id": "...", "data": { } }
```
- **Display** `ws(s)://<origin>/ws/overlay/display?key=<overlayKey>` (tanpa login)
  - Server→client:
    - `hello`: `{ creatorId, queueDepth, paused }`
    - `play` (`id`=overlayEventId): `data` = payload donasi:
      `{ overlayEventId, donationId, type, donorName, isAnonymous, amount, durationSeconds, message, videoId, canonicalUrl }`
    - `skip` (`id`=overlayEventId yang di-skip, bisa null): `{ "overlayEventId": "…|null" }` — hentikan playback saat ini.
    - `paused`: `{ paused: true }` — controller menekan pause.
    - `resumed`: `{ paused: false }` — controller menekan resume.
  - Client→server: `{ "type":"ack", "id":"<overlayEventId>" }`, `{ "type":"heartbeat" }` (tiap ~10s; presence TTL 30s).
  - **Catatan:** display menerima `skip`/`paused`/`resumed` — hentikan/jeda media yang
    sedang diputar saat event itu masuk; tetap pasif (tanpa UI kontrol).
- **Control** `ws(s)://<origin>/ws/overlay/control?token=<firebaseIdToken>` (login; token harus user ACTIVE)
  - Server→client:
    - `state`: `{ paused, displayOnline, overlayKey, current:"<id>|null", queue:[OverlayQueueItem] }`
    - `play` (juga diforward ke control), `keyRotated` `{ overlayKey }`
  - Client→server: `{type:"pause"|"resume"|"skip"|"purge"}`, `{type:"retry",id}`, `{type:"retryAll",fromStatus}`.

REST kontrol (fallback / aksi non-realtime):
- `GET /api/v1/donations/overlay/queue?status=PENDING|PLAYING|PLAYED|SKIPPED|FAILED` → `OverlayQueueItem[]`
  ```
  { overlayEventId, donationId, type, status, amount, donorName, durationSeconds, attempts, createdAt, playedAt }
  ```
- `POST /api/v1/donations/overlay/pause` · `/resume` · `/skip` → `data:null`
- `POST /api/v1/donations/overlay/{id}/retry` → `data:null`
- `POST /api/v1/donations/overlay/retry?fromStatus=FAILED` → `data:null`
- `DELETE /api/v1/donations/overlay/queue` → `data:null` (purge hanya `PENDING`)

> **Origin WebSocket** = host backend **tanpa** `/api/v1` (mis. `http://localhost:8080`
> → `ws://localhost:8080/ws/...`). Dibangun dari `apiBase` origin (§3.1) oleh `overlay-ws.ts`.

---

## 3. Keputusan arsitektur (frontend)

### 3.1 Config — base URL **tanpa** `/api/v1`
Ubah `apiBase` menjadi **origin saja** (`http://localhost:8080`), bukan `.../api/v1`. Dengan begitu
satu nilai dipakai untuk HTTP, SSE, dan WebSocket.

- `nuxt.config.ts`:
  ```ts
  const apiOrigin = (process.env.NUXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080")
    .replace(/\/+$/, "")
    .replace(/\/api\/v1$/, "");          // buang prefix kalau env masih menyertakannya
  // runtimeConfig.public.apiBase = apiOrigin  (TANPA /api/v1)
  ```
  Tetap pakai key `apiBase` (agar churn minim) tapi nilainya origin.
- `app/composables/useApi.ts`: baseURL = `apiBase` (origin), lalu helper
  **menambahkan prefix `/api/v1` tiap request**:
  ```ts
  const API_PREFIX = "/api/v1";
  const get = (url, opts) => client<ApiResponse<T>>(`${API_PREFIX}${url}`, { method:"GET", ...opts })...
  ```
  Semua call-site lama (`get("/identities/me")`, `get("/balance")`, …) **tidak perlu diubah** —
  prefix ditambahkan terpusat di `useApi`. Ini yang dimaksud "benerin yang hit":
  satu-satunya penyesuaian ada di `useApi` + URL SSE/WS.
- `.env.example`: `NUXT_PUBLIC_API_BASE_URL=http://localhost:8080` (hapus `/api/v1`).
- SSE: `${apiBase}/api/v1/donations/{id}/stream`.
- WS: helper `app/utils/overlay-ws.ts` mengubah `apiBase` origin → `ws(s)://` + path `/ws/...`.
- **Aman**: `useApi().client` tidak dipakai langsung di mana pun (sudah dicek), jadi tidak ada
  call-site mentah yang perlu diperbaiki selain di atas.

### 3.2 Routing publik
`app/middleware/auth.global.ts` memakai `publicRoutes.includes(to.path)` — **tidak bisa**
match route dinamis (`/donate/budi`, `/overlay/<key>`). Ganti jadi pencocokan prefix:
```ts
const publicPrefixes = ["/donate", "/overlay"];
```
Aturan: exact match untuk `["/", "/login", "/register"]`, plus prefix untuk `/donate/*` &
`/overlay/*` (`to.path === p || to.path.startsWith(p + "/")`). Jangan longgarkan lebih dari itu.

### 3.3 Layout & tampilan
- `/donate/[slug]`: `definePageMeta({ layout: false })` — halaman bersih untuk publik, kartu terpusat.
- `/overlay/[key]`: `definePageMeta({ layout: false })` — full-screen, **background transparan**
  (untuk OBS browser source). Tambahkan style scoped `background: transparent` + matikan scroll.
- `/dashboard/**`: tetap `layout: "dashboard"`; controller overlay pakai `middleware: "creator"`.

### 3.4 File baru & perubahan

```
app/
  types/
    donation.ts                  # BARU: tipe donation/overlay + CursorPage<T>
  utils/
    donation-status.ts           # BARU: label+warna status donasi & overlay event
    overlay-ws.ts                # BARU: builder URL WS, tipe envelope, helper parse
  composables/
    useDonations.ts              # BARU (creator): list feed (cursor), get/update page, rotate key
    useDonationCheckout.ts       # BARU (publik): page, channels PAYIN, quote, create, status+SSE
    useOverlayDisplay.ts         # BARU (OBS): WS display, ack, heartbeat, reconnect
    useOverlayController.ts      # BARU (owner): WS control + aksi REST + queue
  pages/
    dashboard/index.vue          # UBAH: saldo (available/pending/hold) + donasi terbaru
    dashboard/donations.vue      # BARU
    dashboard/donation-page.vue  # BARU
    dashboard/overlay.vue        # BARU
    donate/[slug].vue            # BARU (publik)
    overlay/[key].vue             # BARU (publik)
  utils/dashboard-nav.ts         # UBAH: tambah item menu (section "Donasi" role CREATOR)
  composables/useApi.ts          # UBAH: prepend /api/v1 (baseURL jadi origin)
  composables/usePayoutDestinations.ts  # UBAH: /channels?direction=PAYOUT -> /channels/payout
nuxt.config.ts                   # UBAH: apiBase = origin (tanpa /api/v1)
.env.example                     # UBAH: hapus /api/v1
app/middleware/auth.global.ts    # UBAH: dukung public prefix
```

### 3.5 Tipe (`app/types/donation.ts`)
```ts
export interface CursorPage<T> { items: T[]; nextCursor: string | null; hasNext: boolean; }
export type DonationType = "TEXT" | "YOUTUBE";
export type DonationStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";
export type OverlayEventStatus = "PENDING" | "PLAYING" | "PLAYED" | "SKIPPED" | "FAILED";

export interface PublicDonationPage {
  id: string; creatorId: string; slug: string; displayName: string;
  title: string | null; description: string | null; imageUrl: string | null;
  active: boolean; createdAt: string;
}
export interface DonationPage extends PublicDonationPage { overlayKey: string; updatedAt: string; }
export interface UpdateDonationPagePayload {
  displayName?: string; title?: string; description?: string; imageUrl?: string; slug?: string;
}
export interface CreateDonationPayload {
  idempotencyKey: string; creatorId: string; amount: number;
  donorName?: string; donorEmail?: string; channelCode: string;
  type: DonationType; message?: string; videoUrl?: string; isAnonymous: boolean;
}
export interface Donation { /* = DonationRes publik */
  donationId: string; creatorId: string; status: DonationStatus; type: DonationType;
  amount: number; totalChargedAmount: number | null; channelCode: string;
  message: string | null; videoId: string | null; paymentReferenceNumber: string | null;
  paymentExpiresAt: string | null; createdAt: string; paidAt: string | null;
}
export interface CreatorDonation {
  donationId: string; status: DonationStatus; type: DonationType; amount: number;
  totalChargedAmount: number | null; donorName: string | null; donorEmail: string | null;
  isAnonymous: boolean; message: string | null; videoId: string | null;
  channelCode: string; createdAt: string; paidAt: string | null;
}
export interface OverlayQueueItem {
  overlayEventId: string; donationId: string; type: DonationType; status: OverlayEventStatus;
  amount: number; donorName: string | null; durationSeconds: number; attempts: number;
  createdAt: string; playedAt: string | null;
}
export interface OverlayPlayPayload {
  overlayEventId: string; donationId: string; type: DonationType; donorName: string;
  isAnonymous: boolean; amount: number; durationSeconds: number;
  message: string | null; videoId: string | null; canonicalUrl: string | null;
}
// Channel PAYIN publik — fee yang ditanggung donor per channel (platform fee disembunyikan).
export interface PayinChannel {
  id: number; code: string; displayName: string; type: ChannelType; direction: "PAYIN";
  minAmount: number; maxAmount: number;
  pgFeeAmount: number | null;         // null kalau request tanpa `amount`
  totalChargedAmount: number | null;  // null kalau request tanpa `amount`
  currency: string;
}
// Channel PAYOUT — auth; fee memperhitungkan user fee override (VIP).
export interface PayoutChannel {
  id: number; code: string; displayName: string; type: ChannelType; direction: "PAYOUT";
  minAmount: number; maxAmount: number;
  withdrawalFeeAmount: number; feePercentageBps: number; currency: string;
}
```
`CursorPage<T>` bisa juga dijadikan tipe generik di `types/api.ts` bila dipakai lintas modul
(saat ini cukup di `donation.ts`).

### 3.6 Composables — bentuk yang diharapkan

**`useDonations()`** (creator)
- `fetchMine(cursor?)` → `GET /donations/me?size=` → simpan `items`, `nextCursor`, `hasNext`.
- `loadMore()` memakai `nextCursor`.
- `fetchMyPage()` → `GET /donations/me/page`.
- `updateMyPage(payload)` → `PUT /donations/me/page` (lalu refresh).
- `rotateOverlayKey()` → `POST /donations/me/page/overlay-key/rotate`.
- state: `{ donations, myPage, loading, hasNext, fetchMine, loadMore, fetchMyPage, updateMyPage, rotateOverlayKey }`.

**`useDonationCheckout()`** (publik)
- `fetchPage(slug)` → `GET /donation-pages/{slug}`.
- `fetchChannels(amount?)` → `GET /channels/payin?amount=` → `PayinChannel[]` (termasuk `pgFeeAmount`/
  `totalChargedAmount` per channel). Panggil ulang saat `amount` berubah (debounce) supaya fee per
  channel ikut ter-update.
- `create(payload)` → `POST /donations`; simpan `Donation` hasil (termasuk `paymentReferenceNumber`).
- `startPolling(id, intervalMs = 2500)` / `stopPolling()` → poll `GET /donations/{id}` sampai `PAID`
  (terminal: `PAID`/`EXPIRED`/`FAILED`). Opsional: `subscribeSse(id)` pakai `EventSource`
  ke `${apiBase}/donations/${id}/stream`, lalu fallback polling.
- `onScopeDispose` untuk bersihkan interval/EventSource.

**`useOverlayDisplay()`** (OBS)
- `connect(overlayKey)` → `new WebSocket(wsUrl('/ws/overlay/display', { key }))`.
- `onPlay(cb)`, `onHello(cb)`; `ack(overlayEventId)`; heartbeat interval 10s.
- Auto-reconnect dengan exponential backoff saat `close`/`error`; kirim ulang heartbeat.
- `disconnect()`.

**`useOverlayController()`** (owner)
- `connect()` → WS control pakai `getIdToken()` saat handshake; reconnect saat token refresh.
- state reaktif dari `state` event: `{ paused, displayOnline, overlayKey, current, queue }`.
- aksi prefer WS: `pause()`, `resume()`, `skip()`, `retry(id)`, `retryAll(fromStatus)`, `purge()`.
- fallback REST (`GET /donations/overlay/queue`, dst.) kalau WS belum terhubung.
- `fetchQueue(status?)` untuk daftar "sudah diputar" (`status=PLAYED`).

---

## 4. Fase implementasi

> Setiap fase: kerjakan → `bun run build` hijau → cek manual → baru lanjut.

### Fase 0 — Fondasi (tanpa UI baru)
**Tujuan:** semua pijakan siap, build tetap hijau.
- [x] `nuxt.config.ts` + `.env.example` (+ `.env` lokal): `apiBase` = **origin tanpa `/api/v1`** (§3.1).
      Nilai `/api/v1` dibuang otomatis kalau env masih menyertakannya.
- [x] `app/composables/useApi.ts`: baseURL origin + prepend `/api/v1` di helper `apiPath()`
      (call-site lama tidak berubah).
- [x] Migrasi endpoint channel: `usePayoutDestinations.fetchChannels` → `get("/channels/payout")` (auth);
      tipe channel jadi `PayoutChannel`. `Channel` lama di `types/payment.ts` ditandai `@deprecated`.
- [x] Buat `app/utils/overlay-ws.ts` (builder URL `ws(s)://` dari origin + tipe envelope + parse/encode aman).
- [x] Buat `app/types/donation.ts` (§3.5) — termasuk `PayinChannel`/`PayoutChannel`.
- [x] Buat `app/utils/donation-status.ts` (`donationStatusMeta`, `overlayStatusMeta`).
- [x] Ubah `auth.global.ts` agar mendukung prefix publik `/donate` & `/overlay` (§3.2).
- [x] **Acceptance:** `bun run build` hijau ✅. Sisa cek manual (Network tab + `/donate/x` tidak
      redirect) dilakukan saat halaman publik dibuat di Fase 4/5.

### Fase 1 — Dashboard ringkasan saldo (F1) ✅
**File:** `app/pages/dashboard/index.vue` (edit) + `app/composables/useDonations.ts` (baru).
- [x] Kartu saldo: **Tersedia**/`available`, **Pending**/`pending`, **Ditahan untuk penarikan**/`withdrawalPayable`.
- [x] Blok "Donasi terbaru" (khusus `CREATOR`, 5 item): donatur/Anonim, tipe, waktu, nominal, status.
- [x] Blok "Pembayaran terbaru" dipertahankan.
- [x] `useDonations` dibuat di fase ini (dipakai Fase 1–3).
- **Acceptance:** build hijau ✅ (angka & guard perlu cek manual dengan backend hidup).

### Fase 2 — Daftar donasi creator (F2) ✅
**File:** `app/pages/dashboard/donations.vue` (baru) + nav.
- [x] `layout: "dashboard"` + `middleware: "creator"` + `UDashboardPanel`.
- [x] Tabel: Donatur / Pesan (`line-clamp-2` + tooltip) / Tipe / Nominal / Total tagihan / Waktu / Status.
      Anonim → "Anonim" + sembunyikan email; status pakai `donationStatusMeta`; kolom sekunder
      disembunyikan di layar kecil.
- [x] Filter status client-side (`USelect`).
- [x] Pagination "Muat lebih banyak" (`nextCursor`/`hasNext`).
- [x] Nav: section "Donasi" `roles: ["CREATOR"]`.
- **Acceptance:** build hijau ✅.

### Fase 3 — Kelola halaman donasi + overlay key (F3) ✅
**File:** `app/pages/dashboard/donation-page.vue` (baru) + nav.
- [x] Muat `GET /donations/me/page` (auto-create).
- [x] Form (Zod): `displayName`, `title`, `description`, `imageUrl`, `slug` (regex + 409 → `setErrors`).
- [x] Kartu "Overlay": `overlayKey` (mask + reveal + copy), URL display + copy, tombol **Rotasi**
      (konfirmasi modal).
- [x] Tautan "Buka halaman publik" → `/donate/{slug}`.
- [x] Nav: item "Halaman donasi".
- **Acceptance:** build hijau ✅.

### Fase 4 — Halaman donasi publik / donor (F4) ✅
**File:** `app/pages/donate/[slug].vue` (baru) + `app/composables/useDonationCheckout.ts` (baru).
- [x] `GET /donation-pages/{slug}`; 404 → "Halaman tidak ditemukan"; `active=false` → "Donasi ditutup".
- [x] `GET /channels/payin` + refetch `?amount=` (debounce 400ms) untuk fee per channel.
- [x] Form (Zod computed): amount (IDR), type (radio TEXT/YOUTUBE), message ≤350, videoUrl (validasi
      YouTube klien), channelCode, donorName/donorEmail, isAnonymous (sembunyikan nama).
- [x] Rincian fee: Biaya layanan (`pgFeeAmount`) + Total bayar (`totalChargedAmount`) — angka backend,
      bukan hasil hitung FE.
- [x] Submit dengan `idempotencyKey` sekali per intent; `ApiError.errors[]` → `form.setErrors`.
- [x] Tampilan pembayaran: QRIS → render QR dari `paymentReferenceNumber` via **`uqr`** (SVG);
      VA/lainnya → nomor + copy; countdown dari `paymentExpiresAt`.
- [x] Pantau status: SSE `/{id}/stream` (event `paid`) **+** polling 2,5s sebagai jaring pengaman;
      sukses/EXPIRED/FAILED ditangani; retry reset state.
- [x] Bersihkan SSE/interval di `onScopeDispose`.
- **Catatan:** dependency baru **`uqr`** (render QR tanpa canvas).
- **Acceptance:** build hijau ✅. Alur bayar end-to-end (sandbox/webhook) = **cek manual**.

### Fase 5 — Overlay display OBS (F5) ✅
**File:** `app/pages/overlay/[key].vue` (baru) + `app/composables/useOverlayDisplay.ts` (baru).
- [x] `layout: false`, full-screen, latar transparan (`html.overlay-active`, lihat `main.css`), tanpa chrome.
- [x] `useOverlayDisplay().connect(key, handlers)`; auto-reconnect backoff + heartbeat 10s.
- [x] `play`: TEXT → kartu (donor/amount/message); YOUTUBE → iframe full + banner.
- [x] `ack` tepat sekali saat durasi habis; `skip`/`paused`/`resumed` menghentikan/menjeda.
- **Catatan:** ack YOUTUBE memakai timer `durationSeconds` backend (belum pakai YouTube IFrame API).
- **Acceptance:** build hijau ✅. Uji di OBS = **cek manual**.

### Fase 6 — Overlay controller (F6) ✅
**File:** `app/pages/dashboard/overlay.vue` (baru) + `app/composables/useOverlayController.ts` (baru).
- [x] `layout: "dashboard"` + `middleware: "creator"`.
- [x] `useOverlayController().connect()` (token Firebase di query); indikator `displayOnline` + `paused`.
- [x] Kontrol: **Pause/Resume**, **Lewati** (konfirmasi), **Bersihkan antrean** (konfirmasi).
- [x] Antrean dipartisi: aktif (PENDING/PLAYING), sudah diputar (PLAYED, tombol Putar ulang),
      gagal/dilewati (tombol Retry + "Retry semua gagal").
- [x] Aksi WS-first, fallback REST; URL OBS + copy.
- [x] Nav: item "Overlay".
- **Acceptance:** build hijau ✅. Perilaku realtime = **cek manual** dengan backend.

### Fase 7 — Penyelesaian ✅
- [x] `bun run build` hijau (final).
- [x] Perbarui `AGENTS.md` frontend: route baru, composable/util/tipe baru, prefix publik, `apiBase` origin.
- [x] `BACKEND_REQUESTS.md` dihapus (kedua gap sudah diimplementasi backend).
- [ ] **Cek manual** (butuh backend + OBS): alur donor bayar → PAID; overlay play → ack → PLAYED;
      retry dari controller; guard non-creator/non-admin.

---

## 5. Catatan teknis penting (hindari kesalahan)

1. **Channel dipisah.** Donor pakai `GET /channels/payin` (publik); form rekening creator pakai
   `GET /channels/payout` (**auth**). Jangan pakai `GET /channels?direction=` lama (deprecated).
2. **SSE `EventSource` tidak bisa set header** — endpoint stream sudah publik, jadi tidak masalah.
   Bangun URL dari `${apiBase}/api/v1/donations/{id}/stream` (`apiBase` kini **origin** tanpa prefix).
   Tutup `EventSource` saat status terminal.
3. **WS control butuh token Firebase di query**, bukan header. Ambil `getIdToken()` **saat** connect.
   Token ~1 jam → reconnect berkala / saat `close` code auth. Jangan simpan token.
4. **WS URL tidak pakai `/api/v1`.** Bangun dari `apiBase` (origin, §3.1) + path `/ws/...`; tukar
   `http→ws`/`https→wss`.
5. **Cursor `/donations/me` bertipe UUID**; `nextCursor` null = berhenti.
6. **Idempotency donasi:** key sekali per intent, reuse saat retry (pola `payouts.vue`).
7. **Jangan hitung fee/uang di frontend.** Hanya tampilkan angka dari backend.
8. **Route dinamis publik** butuh prefix matching di `auth.global.ts` — jangan menambah `/` ke prefix.
9. **Overlay background transparan** khusus untuk OBS; pastikan tidak bentrok `color-mode` global.
10. **Overlay display menerima sinyal kontrol** `skip`/`paused`/`resumed` dari backend:
    saat menerimanya, hentikan/jeda media yang sedang diputar. Tidak perlu menunggu item berikutnya.

---

## 6. Verifikasi tiap fase

- **Wajib:** `bun run build` hijau (lihat §9 `AGENTS.md`).
- **Manual:** login/redirect guard; buka `/donate/<slug>` tanpa login; `/overlay/<key>` tanpa login;
  `/dashboard/donations` sebagai non-creator (redirect `/dashboard`).
- **Data uang:** samakan angka saldo & total dengan `/balance` dan `DonationRes` (jangan asumsi FE).

---

## 7. Definition of Done

- Semua fase §4 selesai & build hijau.
- Alur donor end-to-end (form → bayar → PAID) dan overlay (play → ack → PLAYED → retry dari controller) berjalan.
- Halaman dashboard saldo menampilkan `available`, `pending`, dan `withdrawalPayable` (hold).
- Dokumentasi (`AGENTS.md`, todo ini) sinkron dengan kode.
- Tidak ada file `../backend` yang disentuh; kontrak backend diverifikasi via Swagger + source backend.

---

## 8. Status backend (semua sudah tersedia)

**Channel ber-fee & dipisah PAYIN/PAYOUT. ✅ TERVERIFIKASI.**
- `GET /channels/payin?amount=` **publik**: tiap channel memuat `pgFeeAmount`/`totalChargedAmount`
  (fee PG ditanggung donor) — **tanpa** `platformFeeAmount`/`netCreatorAmount`. `amount` opsional
  (bila kosong, kedua field fee `null`).
- `GET /channels/payout` **auth**: memuat `withdrawalFeeAmount`/`feePercentageBps` yang sudah
  memperhitungkan `UserFeeOverride` (creator VIP).
- `GET /channels?direction=` lama tetap ada tapi **deprecated**.
Fee ditampilkan **per channel** (route/attempt berbeda).

**Sinyal pause/skip ke display OBS. ✅ TERVERIFIKASI.**
Display (`/ws/overlay/display`) menerima `skip` / `paused` / `resumed` dari server (fan-out
Redis `donation:overlay:control:{creatorId}`), sehingga OBS langsung menghentikan/menjeda media yang
sedang diputar. Handler tetap pasif; state diubah service.

**Instruksi QRIS. ✅ cukup, tanpa perubahan backend.**
Untuk channel `QRIS`, adapter Midtrans mengisi `paymentReferenceNumber` dari response
`qr_string` (lihat `MidtransPayinClient.toChargeResult`), yaitu **QR string** (payload EMVCo),
bukan sekadar reference id. Frontend cukup me-render QR dari string ini (mis. library QR client-side);
tidak perlu field `qrImageUrl` tambahan.
