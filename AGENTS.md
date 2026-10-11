# AGENTS.md — GePay Frontend Conventions

> **Sumber kebenaran tunggal repo ini soal cara menulis kode.**
> Ditulis untuk manusia **dan** AI coding agent. Kalau kebiasaanmu
> bertentangan dengan aturan di sini, **aturan yang menang**. Kalau aturannya
> terasa salah, ubah aturan (dan kode yang dijelaskan) dalam satu perubahan —
> jangan menyimpang diam-diam.
>
> Backend punya aturannya sendiri di [`../backend/AGENTS.md`](../backend/AGENTS.md)
> — baca itu untuk kontrak API, envelope, error, dan aturan domain.

Dokumen ini adalah **index**: fakta cepat, aturan emas, peta bagian, dan
resep umum. Setiap `§N` yang dirujuk dari kode (`lihat §3 AGENTS.md`) menunjuk
ke bagian di bawah, jadi **nomor bagian itu API publik — jangan di-renumber**.

---

## Quick facts

| Item | Nilai |
|---|---|
| Framework | Nuxt 4 (`app/` sebagai `srcDir`) |
| Bahasa | TypeScript + Vue 3.5 (`<script setup lang="ts">`) |
| UI | `@nuxt/ui` v4 + Tailwind CSS v4 |
| Rendering | SPA murni (`ssr: false`) + `spaLoadingTemplate` |
| Auth | Firebase Web SDK (client) → provisioning backend via `GET /identities/me` |
| HTTP | `$fetch` yang dibungkus `useApi` (envelope + Bearer token + `ApiError`) |
| State | Nuxt `useState` / composables |
| Validasi | Zod (form) |
| Ikon | `@nuxt/icon` (koleksi `lucide` default) |
| Package manager | **bun** (`bun.lock`) |
| Bahasa UI & komentar | Indonesia |
| Config | `nuxt.config.ts` + `app/app.config.ts` |

### Area aplikasi

| Area | Route | Layout | Gate |
|---|---|---|---|
| Publik | `/`, `/login`, `/register` | `default` / `false` | — |
| Dashboard user | `/dashboard/**` | `dashboard` | login (global) |
| Dashboard creator | `/dashboard/payouts` | `dashboard` | login + role `CREATOR` |
| Dashboard admin | `/internal/**` | `admin` | login + role `ADMIN`/`SUPER_ADMIN` |

---

## Golden rules (TL;DR)

1. **Semua HTTP lewat `useApi`.** Jangan panggil `$fetch`/`fetch` langsung. Ia
   sudah handle `baseURL` (origin) + prefix `/api/v1`, attach `Bearer` token,
   unwrap `ApiResponse<T>`, dan melempar `ApiError`. → §3
2. **Branching error pakai `ApiError.code`** (mis. `http.unauthorized`), **jangan
   `message`** — pesan datang ter-i18n dari backend. → §3
3. **Kontrak tipe disinkron manual.** `app/types/api.ts` & `app/types/auth.ts`
   harus samain field-nya dengan DTO backend; tidak ada codegen. → §3
4. **Setelah login/registrasi wajib `syncFromBackend()`** (`GET /identities/me`)
   — itu yang trigger provisioning user di backend. Gagal → `logout()`. → §4
5. **`hasRole()` cuma UI guard.** Enforcement asli tetap `@PreAuthorize` di
   backend. Jangan pernah anggap ini security. → §4
6. **Jangan simpan token manual.** Biarkan Firebase persistence
   (`browserLocalPersistence`). → §4
7. **Route publik didaftar di `publicRoutes`/`publicPrefixes`**
   (`app/middleware/auth.global.ts`). Selain daftar itu wajib login — jangan
   taruh halaman privat di sana. → §2/§4
8. **Area admin = `pages/internal/**`.** Gate `admin` + layout `admin` diwarisi
   dari `pages/internal.vue`. Nambah halaman admin cukup bikin file di folder
   itu — tanpa menulis meta lagi. → §2/§6
9. **Warna wajib token semantik Nuxt UI** (`text-default`, `bg-elevated`,
   `border-default`, `text-muted`, …). Jangan palette mentah (`text-gray-500`,
   `bg-blue-600`). → §5
10. **Komponen Nuxt UI dulu.** Cek MCP `nuxt-ui` / skill sebelum bikin komponen
    custom. Jangan reinvent Modal/Table/Form. → §5
11. **App dibungkus `UApp`** (`app.vue`) — wajib untuk toast/overlay/tooltip.
    Jangan hapus `<NuxtLayout><NuxtPage /></NuxtLayout>` di dalamnya. → §5
12. **Ikon format `i-lucide-*`** (atau koleksi lain yang jelas); verifikasi nama
    lewat MCP `search-icons`. → §5
13. **State bersama pakai `useState("key")`**, bukan variabel singleton module.
    Pengecualian sadar: dedup promise in-flight di `useCurrentUser`. → §3
14. **Menu sidebar satu sumber** di `app/utils/dashboard-nav.ts`. Jangan
    hardcode item menu di layout. → §6
15. **Config via `useRuntimeConfig().public`.** Jangan hardcode URL/secret;
    `.env` tidak di-commit (yang di-commit hanya `.env.example`). → §7
16. **Selesaikan dengan `bun run build` hijau.** Tidak ada test/lint runner
    yet; build + cek manual flow. → §9

---

## Section map (stable `§N`)

| § | Topik |
|---|---|
| §1 | Stack & runtime (Nuxt, Nuxt UI, SPA) |
| §2 | Struktur file & routing (layout, middleware, area) |
| §3 | Data & API (useApi, envelope, tipe, state) |
| §4 | Auth & authorization (Firebase → /me → role) |
| §5 | UI & design system (semantic color, komponen, ikon) |
| §6 | Dashboard & navigasi (shell, menu, admin) |
| §7 | Konfigurasi & environment |
| §8 | Gaya kode & penamaan |
| §9 | Verifikasi & Definition of Done |
| §10 | Anti-patterns |

### Commands

```bash
bun install           # pasang dependency
bun run dev           # dev server di http://localhost:3000
bun run build         # build produksi (jalankan sebelum selesai)
bun run preview       # preview hasil build
bun run generate      # static generate
```

> Nuxt UI otomatis mendaftarkan `@nuxt/icon`, `@nuxt/fonts`, `@nuxtjs/color-mode`.
> **Jangan** tambahkan mereka ke `modules` di `nuxt.config.ts`.

---

## §1 Stack & runtime

- **Nuxt 4**, `srcDir` = `app/`. Jadi semua kode aplikasi di `app/`, bukan root.
- **SPA murni** (`ssr: false`). Konsekuensi: tidak ada SSR/SEO server; meta pakai
  `useSeoMeta` tetap berguna untuk title/description client-side. Jangan
  mengandalkan kode yang cuma jalan di server.
- **Nuxt UI v4** ditenagai Reka UI + Tailwind Variants. Tema global di
  `app/app.config.ts` (`ui.colors`: `primary: emerald`, `neutral: slate`).
- **Auto-import** aktif untuk `composables/`, `utils/`, dan `components/`.
  Jangan import manual untuk hal yang sudah auto-import (mis. `useAuth`).
- **QR QRIS**: render di klien pakai `uqr` (`renderSVG`, tanpa canvas) — jangan
  kirim string QR ke layanan pihak ketiga.
- Urutan plugin: plugin `.client.ts` (mis. `firebase.client.ts`) jalan sebelum
  route middleware, jadi `useNuxtApp().$firebaseAuth` sudah tersedia di
  middleware.

## §2 Struktur file & routing

```
app/
  assets/css/main.css        # Tailwind + Nuxt UI + style scrollbar
  components/                 # auto-import; pakai prefix App* untuk global
  composables/                # useApi, useAuth, useCurrentUser, useBalance,
                              #   usePayments, usePayoutDestinations, useWithdrawals,
                              #   useDonations, useDonationCheckout,
                              #   useOverlayDisplay, useOverlayController
  layouts/                    # default, dashboard, admin
  middleware/
    auth.global.ts            # guard login + daftar route publik
    admin.ts                  # gate role untuk /internal/**
    creator.ts                # gate role CREATOR untuk halaman creator
  pages/
    index.vue                 # landing (publik)
    login.vue, register.vue   # publik, layout: false
    dashboard/**              # area user (meta layout: dashboard)
    dashboard/payments.vue    # pembayaran masuk (earnings)
    dashboard/payouts.vue     # pencairan creator (middleware creator)
    dashboard/donations.vue   # feed donasi creator (middleware creator)
    dashboard/donation-page.vue # kelola halaman donasi + overlay key (creator)
    dashboard/overlay.vue     # kontrol overlay OBS (middleware creator)
    donate/[slug].vue         # halaman donasi publik (layout: false)
    overlay/[key].vue         # display overlay OBS (publik, layout: false)
    internal.vue              # parent /internal/** (layout + middleware admin)
    internal/**               # area admin (meta diwarisi)
  plugins/firebase.client.ts  # init Firebase App + Auth
  types/                      # api.ts, auth.ts, payment.ts, donation.ts (kontrak manual ke backend)
  utils/
    dashboard-nav.ts          # sumber menu sidebar (user + admin)
    firebase-error.ts         # AuthError + mapping pesan
    format.ts                 # formatIdr / formatDateTime
    idempotency.ts            # kunci idempotensi client-side
    channel.ts                # turunkan bankCode dari kode channel
    payment-status.ts         # label + warna badge status pembayaran/penarikan
    donation-status.ts        # label + warna badge status donasi/overlay
    overlay-ws.ts             # builder URL WebSocket overlay + envelope/parse
  app.config.ts               # warna tema Nuxt UI
  app.vue                     # UApp > NuxtLayout > NuxtPage
nuxt.config.ts
```

**Aturan routing:**

- **Pemetaan area**: route user = `/dashboard/**`, route admin = `/internal/**`.
  Jangan campur halaman admin ke `/dashboard`.
- **Layout dipilih per halaman** via `definePageMeta({ layout: "dashboard" })`.
  Landing memakai `layouts/default.vue`; auth pages memakai `layout: false`.
- **Pewarisan meta (penting)**: `pages/internal.vue` adalah parent route dengan
  `definePageMeta({ layout: "admin", middleware: "admin" })`. Nuxt mengumpulkan
  layout & middleware dari **semua route record yang match** (parent + anak),
  jadi semua anak `/internal/**` otomatis ter-gate. Nambah halaman admin = cukup
  file baru di `pages/internal/`. `pages/dashboard/**` belum pakai parent (tiap
  halaman menulis `layout: "dashboard"`); boleh dirapikan ke pola yang sama
  kalau mau.
- **Route publik**: `auth.global.ts` mencocokkan route publik secara **exact**
  (`publicRoutes = ["/", "/login", "/register"]`) plus **prefix** untuk halaman
  ber-parameter (`publicPrefixes = ["/donate", "/overlay"]`, dicocokkan
  `path === prefix || path.startsWith(prefix + "/")`). Tambah route publik baru
  ke salah satu daftar itu; halaman privat jangan dimasukkan.
- **Catch-all placeholder** (`[...slug].vue`) dipakai sebagai halaman "belum
  jadi" yang rapi (mengambil judul dari `dashboard-nav.ts`). Halaman spesifik
  selalu menang atas catch-all.

## §3 Data & API

- **`useApi()`** (`app/composables/useApi.ts`) mengembalikan
  `{ client, get, post, put, patch, del }`:
  - `baseURL` = `runtimeConfig.public.apiBase` = **origin** backend (tanpa
    `/api/v1`); helper menambahkan prefix `/api/v1` terpusat, jadi cukup tulis
    path relatif: `get("/identities/me")`. Origin yang sama dipakai SSE/WebSocket.
  - `onRequest` meng-attach `Authorization: Bearer <idToken>` (auto-refresh via
    Firebase `getIdToken()`).
  - `onResponseError` selalu melempar `ApiError` dari body `ErrorResponse`.
  - `get`/`post`/… otomatis meng-unwrap `.data` dari amplop `ApiResponse<T>`.
  - Tambah method lain di sini, **jangan** bikin `$fetch` baru.
- **Envelope** (samain backend): `ApiResponse<T> = { message, data }`,
  `ErrorResponse = { code, message, errors }`. Lihat `app/types/api.ts`.
- **`ApiError`** membawa `status`, `code`, `errors`, dan helper `is(code)`.
  Gunakan `err instanceof ApiError` + `err.code`; teks hanya untuk ditampilkan.
- **Kontrak tipe** disinkron manual ke backend (`../backend`). Kalau backend
  ganti field → ubah `types/*` di perubahan yang sama. Backend nambah Role →
  update `ROLES` di `app/types/auth.ts`. Kontrak payment ada di
  `app/types/payment.ts`; kontrak donation/overlay/channel di
  `app/types/donation.ts`.
- **Idempotensi aksi uang**: generate kunci SEKALI per aksi lewat
  `newIdempotencyKey()` (`app/utils/idempotency.ts`), simpan, dan pakai ulang
  saat retry — jangan regenerate tiap submit (mis. penarikan bisa dobel).
- **State bersama**: `useState("key", () => initial)`. Contoh yang ada:
  `auth-user`, `auth-ready`, `current-user`, `auth-error`.
- **`useCurrentUser()`** = source of truth role dari backend:
  - `syncFromBackend()` → `GET /identities/me`, dedup request in-flight.
  - `hasRole(role)` → cek UI.
  - `clear()` saat logout.

## §4 Auth & authorization

Alur wajib (jangan dilewat):

```
login (Firebase) → syncFromBackend() GET /me  → principal { userId, email, name, roles, status }
                        └─ gagal → logout() + pesan
```

- **`useAuth()`**: `loginWithCredentials`, `loginWithGoogle`, `registerWithEmail`
  (kirim verifikasi lalu `signOut`), `sendResetPassword`, `logout(redirect=true)`.
- **Error Firebase** dipetakan di `utils/firebase-error.ts` jadi `AuthError`.
  Anti-enumeration: `user-not-found` & `wrong-password` sengaja sepakat "Email
  atau kata sandi salah". Branching pakai `AuthError.code`.
- **`auth.global.ts`**:
  1. Tunggu `auth-ready` (restore sesi Firebase) sebelum memutuskan redirect.
  2. Hard refresh: user ada tapi principal kosong → `syncFromBackend()`; gagal →
     simpan `{code, message}` ke `useState("auth-error")`, `logout(false)`, ke `/login`.
  3. Belum login + halaman privat → `/login`.
  4. Sudah login buka `/login`/`/register` → `/dashboard`.
  5. `publicRoutes = ["/", "/login", "/register"]` (+ prefix `/donate`, `/overlay`).
- **`admin.ts`** (named): tanpa role `ADMIN`/`SUPER_ADMIN` → redirect `/dashboard`.
  Dipasang sekali di `pages/internal.vue`.
- **Jangan** menyimpan token ke `localStorage` manual dan jangan menganggap
  `hasRole()` sebagai proteksi.

## §5 UI & design system

- **`UApp`** membungkus app (`app.vue`) — wajib untuk `useToast`, tooltip,
  overlay programatik. Struktur: `UApp > NuxtLoadingIndicator + NuxtLayout > NuxtPage`.
- **Warna semantik** (jangan palette mentah):
  - Teks: `text-default`, `text-muted`, `text-toned`, `text-dimmed`, `text-highlighted`.
  - Latar: `bg-default`, `bg-muted`, `bg-elevated`, `bg-accented`.
  - Border: `border-default`, `border-muted`, `border-accented`; `divide-default`.
- **Varian vs bobot**: `solid` (CTA utama, maksimal satu per view), `outline`
  (sekunder/field), `soft`/`subtle` (badge/highlight), `ghost` (ikon/inline),
  `link` (teks di dalam konten). Aksi destruktif → `color="error"` (biasanya
  `soft`/`outline`, bukan `solid`).
- **Komponen dulu, custom kemudian.** Cari lewat MCP Nuxt UI
  (`search-components`, `get-component`, `get-component-metadata`) atau skill di
  `.opencode/skills/nuxt-ui` sebelum menulis komponen sendiri.
- **Override** lewat `class`/`ui` prop atau tema global di `app.config.ts`
  (prioritas: `ui`/`class` → config → default). Baca `.nuxt/ui/<component>.ts`
  untuk daftar slot/variant.
- **Ikon**: `i-lucide-*`. Verifikasi nama lewat MCP `search-icons`.
- **Pengecualian warna**: halaman overlay OBS (`/overlay/[key]`) sengaja memakai
  warna mentah (mis. `bg-black/70`, `text-white`) demi kontras di atas gameplay +
  latar transparan — jangan tiru pola ini di halaman aplikasi lain.
  Lihat juga `app/assets/css/main.css` (`html.overlay-active`).
- **Responsif**: andalkan Nuxt UI (dashboard sidebar auto jadi slideover di
  mobile). Hindari breakpoint manual kecuali perlu. Tabel lebar →
  `overflow-x-auto` + sembunyikan kolom sekunder di layar kecil.
- **A11y**: tombol ikon wajib `aria-label`; jaga fokus pada overlay.
- Lihat juga `app/assets/css/main.css` untuk style scrollbar (`.scrollbar-hover`).

## §6 Dashboard & navigasi

- **Shell bersama**: `app/components/AppDashboardShell.vue` — berisi
  `UDashboardGroup` + `UDashboardSidebar` (collapsible/resizable) + user menu.
  Prop: `sections`, `homeTo`, `settingsTo`. Dipakai layout `dashboard` & `admin`.
- **Layout tipis**: `layouts/dashboard.vue` & `layouts/admin.vue` cuma memilih
  `sections` dan `homeTo`. Logika jangan diduplikasi; taruh di shell.
- **Menu = satu sumber**: `app/utils/dashboard-nav.ts`.
  - `dashboardSections` (user), `internalSections` (admin).
  - Pola menambah menu (contoh terkomentar di file):
    - **Section baru** → `{ label, items: [...] }`.
    - **Dropdown** → item induk **tanpa** `to`, isi `children`.
    - **Satu link** → section dengan satu item.
    - **Khusus admin** → tambahkan `roles: ["ADMIN", "SUPER_ADMIN"]` di section.
    - **Khusus creator** → section "Keuangan" dengan `roles: ["CREATOR"]`
      (contoh: "Pembayaran" → `/dashboard/payments`, "Pencairan" →
      `/dashboard/payouts`).
  - `buildDashboardNavItems(sections, currentPath)` dipakai shell;
    `findDashboardNav`/`findInternalNav` dipakai halaman placeholder.
  - Item induk dapat `active`/`defaultOpen` otomatis kalau salah satu anaknya
    aktif (dihitung dari `currentPath`).
- **Halaman dashboard** memakai `UDashboardPanel` (`#header` → `UDashboardNavbar`
  + `UDashboardSidebarCollapse` di `#leading`, konten di `#body`).

## §7 Konfigurasi & environment

- `nuxt.config.ts`:
  - `apiBase` = `NUXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`) =
    **origin** tanpa `/api/v1` (prefix dibuang otomatis kalau env menyertakannya).
    `useApi` menambahkan `/api/v1`; origin yang sama dipakai SSE & WebSocket.
  - Firebase config dibaca dari env `NUXT_PUBLIC_FIREBASE_*` ke
    `runtimeConfig.public.firebase`.
- Baca nilai di kode lewat `useRuntimeConfig().public`. **Jangan hardcode** URL
  atau kredensial.
- `.env` tidak di-commit; dokumentasikan variabel baru di `.env.example`.
- Rahasia backend (service account, dsb.) **tidak pernah** masuk frontend.

## §8 Gaya kode & penamaan

- `<script setup lang="ts">` di semua SFC; urutan blok `script` → `template`.
- Gaya umum Prettier: 2 spasi, tanda kutip dua, `;`, trailing comma. Samakan
  dengan file sekitarnya; jangan reformat file yang tak berkaitan.
- **Komentar**: tulis dalam **Indonesia**, jelaskan **kenapa** (bukan apa),
  hanya untuk logika yang tidak obvious. Jangan mengomentari kode yang jelas.
- **Penamaan**:
  - Komponen global/berbagi: prefix `App` (`AppLogo`, `AppDashboardShell`).
  - Composable: `useXxx` (`useApi`, `useCurrentUser`).
  - File page/route: lowercase/kebab sesuai URL.
  - Util & tipe: `camelCase` file, `PascalCase` untuk interface/type.
- **Impor**: biarkan auto-import untuk composable/util/komponen Nuxt; import
  eksplisit hanya untuk tipe (`import type { NavigationMenuItem } from "@nuxt/ui"`).
- **Tanpa emoji** di kode/komentar kecuali diminta.
- Jangan commit folder build (`.output`, `.nuxt`, `node_modules` — sudah di
  `.gitignore`).

## §9 Verifikasi & Definition of Done

Belum ada test runner / linter di repo. Maka:

- **Wajib**: `bun run build` hijau sebelum menandai tugas selesai.
- Cek manual alur yang tersentuh (login, redirect guard, buka `/dashboard`,
  buka `/internal` sebagai non-admin).
- Pertimbangkan menambah nanti (dan catat di sini bila ditambah): `vue-tsc`
  (`nuxt typecheck`) untuk type-check, dan ESLint + Prettier.
- **DoD** sebuah perubahan: build hijau + alur manual benar + dokumen
  (`AGENTS.md`, `readme/auth.md`) diupdate di perubahan yang sama.

## §10 Anti-patterns

- ❌ `$fetch`/`axios` langsung, atau menulis ulang attach token/envelope.
- ❌ Branching pakai `err.message`; yang benar `err.code` (`ApiError`/`AuthError`).
- ❌ Menyimpan ID token di `localStorage`.
- ❌ Memakai `hasRole()` sebagai pengaman (backend tetap yang menentukan).
- ❌ Warna palette mentah (`text-gray-500`) atau hex langsung di komponen.
- ❌ Duplikasi logika sidebar di tiap layout — pakai `AppDashboardShell`.
- ❌ Hardcode item menu di layout — taruh di `dashboard-nav.ts`.
- ❌ Menaruh halaman admin di luar `pages/internal/**` (gate jadi tidak jalan).
- ❌ Menambah route privat ke `publicRoutes`.
- ❌ Menambah `@nuxt/icon`/`@nuxt/fonts`/`@nuxtjs/color-mode` ke `modules`.
- ❌ Meng-commit `.env` atau kredensial Firebase/backend.

---

## Resep singkat

**Nambah halaman user + menunya**
1. Buat `app/pages/dashboard/<nama>.vue` dengan
   `definePageMeta({ layout: "dashboard" })` + `UDashboardPanel`.
2. Tambah item di `dashboardSections` (`app/utils/dashboard-nav.ts`).

**Nambah halaman admin**
1. Buat file di `app/pages/internal/<nama>.vue` (layout & gate diwarisi) +
   `UDashboardPanel`.
2. Tambah item di `internalSections`.

**Nambah halaman creator**
1. Buat `app/pages/dashboard/<nama>.vue` dengan
   `definePageMeta({ layout: "dashboard", middleware: "creator" })` +
   `UDashboardPanel`.
2. Tambah section di `dashboardSections` dengan `roles: ["CREATOR"]`.

**Aksi uang (withdraw dsb.)**
1. Generate kunci sekali via `newIdempotencyKey()`; pakai ulang saat retry.
2. Kirim lewat `useApi`; backend memakai key itu agar tidak dobel.
3. Konversi/format rupiah dengan `formatIdr` (`app/utils/format.ts`).

**Nambah endpoint API**
1. Pastikan DTO backend-nya; samakan tipe di `app/types/`.
2. Panggil via `useApi().get/post` (jangan lupa unwrap sudah otomatis).
3. Tangani error dengan `err instanceof ApiError` + `err.code`.

**Nambah route publik**
1. Tambah path ke `publicRoutes` (exact) atau `publicPrefixes` (dinamis) di
   `app/middleware/auth.global.ts`.

**Halaman donasi & overlay (kreator / publik)**
1. Donor publik: `/donate/[slug]` → `useDonationCheckout` (page + `/channels/payin`
   + `POST /donations` + SSE/polling). Fee hanya ditampilkan, tidak dihitung FE.
2. Kelola halaman/overlay key: `/dashboard/donation-page` → `useDonations`.
3. Display OBS: `/overlay/[key]` → `useOverlayDisplay` (WS `display`, `ack` +
   `heartbeat`; latar transparan via class `overlay-active`).
4. Kontrol OBS: `/dashboard/overlay` → `useOverlayController` (WS `control`,
   token Firebase di query; aksi WS-first + fallback REST).
5. Idempotensi donasi: `newIdempotencyKey()` sekali per intent (reuse saat retry).

**Nambah role**
1. Tambah di `ROLES` (`app/types/auth.ts`) **dan** di backend.
2. Pakai `hasRole()` untuk show/hide; jangan jadikan security.

---

## Maintenance rules untuk dokumen ini

- **Update dokumen bareng kode, dalam satu perubahan.** Perubahan kode yang
  mengubah perilaku yang dijelaskan di sini belum selesai sampai dokumen cocok.
- **Nomor `§N` stabil.** Materi baru ditambahkan (tambah § di akhir atau sub-§);
  jangan renumber bagian yang ada.
- Setiap klaim harus bisa diverifikasi dari kode. Kalau ragu, baca kode dulu
  sebelum mengedit dokumen.
- Nama message key/`code`, nama env, dan kontrak tipe adalah API publik —
  mengubahnya adalah breaking change yang harus disengaja dan didokumentasikan.
