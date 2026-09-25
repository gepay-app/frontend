import { FirebaseError } from "firebase/app";

export class AuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

// Sengaja user-not-found & wrong-password dikasih pesan SAMA kayak
// invalid-credential — biar gak jadi celah info "email ini terdaftar apa
// nggak" (prinsip sama kayak RestAuthenticationEntryPoint di backend).
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email atau kata sandi salah.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/user-not-found": "Email atau kata sandi salah.",
  "auth/wrong-password": "Email atau kata sandi salah.",
  "auth/user-disabled": "Akun ini dinonaktifkan. Hubungi admin.",
  "auth/too-many-requests":
    "Terlalu banyak percobaan gagal. Coba lagi beberapa saat lagi.",
  "auth/network-request-failed": "Koneksi bermasalah. Periksa jaringan kamu.",
  "auth/popup-closed-by-user": "Login dibatalkan.",
  "auth/cancelled-popup-request": "Login dibatalkan.",
  "auth/popup-blocked":
    "Popup login diblokir browser. Izinkan popup untuk situs ini.",
  "auth/account-exists-with-different-credential":
    "Email ini sudah terdaftar dengan metode login lain (coba metode lain).",
  // Signup memang harus kasih tahu kalau email sudah dipakai — gak bisa
  // disembunyikan seperti login (Firebase sendiri yang menolak).
  "auth/email-already-in-use": "Email ini sudah terdaftar. Coba masuk saja.",
  "auth/weak-password": "Kata sandi terlalu lemah (minimal 6 karakter).",
};

export function mapFirebaseAuthError(err: unknown): AuthError {
  if (err instanceof FirebaseError) {
    return new AuthError(
      err.code,
      MESSAGES[err.code] ?? "Login gagal. Coba lagi.",
    );
  }
  return new AuthError("unknown", "Terjadi kesalahan tak terduga.");
}
