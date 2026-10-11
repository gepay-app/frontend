// app/utils/channel.ts

// Kode channel menyimpan arah+jenis sebagai prefix (mis. BANK_BCA,
// EWALLET_GOPAY). Backend menyimpan `bankCode` bebas sebagai metadata
// rekening, jadi cukup diturunkan jadi kode pendek yang enak dibaca.
export function bankCodeFromChannelCode(code: string): string {
  return code.replace(/^(BANK_|EWALLET_|VA_)/, "");
}
