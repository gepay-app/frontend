// app/utils/idempotency.ts

// Kunci idempotensi client-side untuk aksi yang menulis uang (withdraw).
// Best practice: generate SEKALI per aksi, simpan, dan pakai ulang saat retry
// — backend (WithdrawalService) memakai key ini agar tidak membuat penarikan
// dobel saat request diulang karena timeout/refresh.
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
