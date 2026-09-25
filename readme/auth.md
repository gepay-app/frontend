# Integrasi Auth — Nuxt SPA + NuxtUI + Firebase

> Referensi backend: `backend/specs/auth.md`. Kalau backend berubah, cek ulang
> bagian yang bersangkutan di sini.

---

## 0. Alur end-to-end (baca dulu sebelum ngoding)

```
1. User daftar (email+password) ATAU login (email+password / Google).
   - Daftar: createUserWithEmailAndPassword → updateProfile(displayName)
     → sendEmailVerification → signOut. User harus verifikasi email dulu.
2. Firebase Client SDK verifikasi credential → dapat Firebase User + ID token.
3. Frontend HARUS langsung hit GET /identities/me (apiBase sudah termasuk
   `/api/v1`)
   → inilah yang trigger provisionOnFirstLogin di backend (bukan step 2!).
4a. 200 OK → dapat UserPrincipal { userId, email, name, roles, status }
    → simpan di state → redirect ke halaman utama.
4b. 401 → email belum terverifikasi / tidak dikenal → signOut() Firebase +
    pesan "cek inbox verifikasi".
4c. 403 code `identity.user.disabled` → akun disuspend → signOut() Firebase.
    Pesan tampil diambil dari `e.message` backend; kalau error terjadi di
    middleware, `{code, message}` dibawa lewat `useState("auth-error")`
    (bukan query string) lalu dibaca `login.vue`.
5. Request selanjutnya → attach `Authorization: Bearer <ID token>` → token
   diambil ulang tiap request via getIdToken() (auto-refresh).
```

Kenapa langkah 3 tidak boleh diskip: backend cuma "kenal" `auth_id` Firebase
setelah `provisionOnFirstLogin` jalan, dan itu cuma jalan lewat
`IdentityEnrichmentFilter` di request pertama.

Tidak ada lagi konsep "invite" / "belum diundang": user biasa otomatis
dibuatkan baris identity saat login pertama dengan role `USER`. Admin/creator
di-grant role oleh SUPER_ADMIN.

---

## 1. Struktur file (Nuxt 4 — `app/` sebagai `srcDir`)

```
app/
  types/
    api.ts          # ApiResponse, ErrorResponse, ApiError — kontrak generik
    auth.ts         # Role, UserStatus, UserPrincipal — kontrak identity module
  utils/
    firebase-error.ts   # mapping error code Firebase → pesan Indonesia
  plugins/
    firebase.client.ts  # init Firebase App + Auth, auth state global
  composables/
    useApi.ts           # $fetch wrapper: auto-attach token, parse error
    useAuth.ts          # register/login/logout/reset password
    useCurrentUser.ts   # sync ke /me, source of truth role
  middleware/
    auth.global.ts      # route guard
  pages/
    login.vue
    register.vue
nuxt.config.ts
```

---

## 2. `types/auth.ts` — kontrak module identity

```ts
export const ROLES = ["SUPER_ADMIN", "ADMIN", "CREATOR", "USER"] as const;
export type Role = (typeof ROLES)[number];

export type UserStatus = "ACTIVE" | "DISABLED";

export interface UserPrincipal {
  userId: string;
  email: string;
  name: string | null; // Firebase gak jamin displayName
  roles: Role[];       // multi-role (mis. ["USER", "CREATOR"])
  status: UserStatus;
}
```

`ROLES` **disinkron manual** dengan `identity.api.dtos.Role` tiap backend nambah
role baru.

---

## 3. `composables/useAuth.ts` — register/login/logout

```ts
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

// registerWithEmail: create → updateProfile → sendEmailVerification → signOut.
// signOut penting: sesi Firebase tanpa backend provisioning bakal 401 terus.
```

`logout(redirect = true)` juga `useCurrentUser().clear()`; middleware memanggil
`logout(false)` supaya bisa set flash `useState("auth-error")` dan redirect
sendiri.

> Anti email-enumeration: pesan `user-not-found` dan `wrong-password` dibuat
> sama ("Email atau kata sandi salah"). Di signup, `email-already-in-use`
> memang harus dibedakan (Firebase sendiri yang menolak).

---

## 4. `composables/useCurrentUser.ts` — source of truth dari backend

```ts
const syncFromBackend = async (): Promise<UserPrincipal | null> => {
  // dedup in-flight request, panggil GET /identities/me
};

// UI-only guard (show/hide). Enforcement asli TETAP di @PreAuthorize backend.
const hasRole = (role: Role) =>
  principal.value?.roles.includes(role) ?? false;
```

`/me` wajib dipanggil tepat setelah login sukses. 401 = email belum
terverifikasi / tidak dikenal; 403 `identity.user.disabled` = akun disuspend —
bukan bug jaringan (lihat `pages/login.vue`).

---

## 5. `middleware/auth.global.ts`

Route publik: `/login` dan `/register`. Selain itu wajib login. Kalau ada
Firebase user tapi principal kosong (hard refresh), panggil `syncFromBackend()`;
kalau gagal → simpan `{code, message}` ke `useState("auth-error")`,
`auth.logout(false)`, lalu redirect `/login`. `login.vue` membaca + clear flash
itu dan menampilkan pesan backend (khusus 401 dipetakan ke hint verifikasi
email, karena backend sengaja generik).

Untuk halaman donasi publik nanti, tambahkan path-nya ke daftar `isPublic`
(atau buat middleware terpisah) — donasi boleh tanpa login.

---

## 6. Checklist

- [ ] `/me` selalu dipanggil tepat setelah login/registrasi sukses.
- [ ] 401 & 403 `identity.user.disabled` dari `/me` → `signOut()` Firebase,
      bukan cuma tampilkan error. Akun suspend dapat pesan jelas.
- [ ] Signup mengirim email verifikasi; user tanpa email terverifikasi
      tidak akan bisa lewat backend (401).
- [ ] Branching error pakai `ApiError.code` / `AuthError.code`, jangan `.message`.
- [ ] Tidak ada token disimpan manual ke `localStorage` — biarkan
      `browserLocalPersistence` Firebase.
- [ ] `hasRole()` cuma untuk UX, bukan security gate.
- [ ] `ROLES`/`Role` di `types/auth.ts` disinkron tiap backend nambah role.
