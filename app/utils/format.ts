// app/utils/format.ts

// Backend menyimpan uang sebagai rupiah bulat (long), bukan desimal.
export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
