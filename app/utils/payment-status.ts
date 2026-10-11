// app/utils/payment-status.ts
// Metadata tampilan status pembayaran & penarikan. Label Indonesia + warna
// badge semantik Nuxt UI. Dipakai halaman pembayaran, pencairan, dan ringkasan.
import type { PaymentStatus, WithdrawalStatus } from "~/types/payment";

export type BadgeColor =
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "error"
  | "neutral";

export const paymentStatusMeta: Record<
  PaymentStatus,
  { label: string; color: BadgeColor }
> = {
  INITIATED: { label: "Dimulai", color: "neutral" },
  PENDING: { label: "Menunggu", color: "warning" },
  PAID: { label: "Berhasil", color: "success" },
  EXPIRED: { label: "Kedaluwarsa", color: "neutral" },
  FAILED: { label: "Gagal", color: "error" },
  CANCELLED: { label: "Dibatalkan", color: "neutral" },
  PARTIALLY_REFUNDED: { label: "Refund sebagian", color: "warning" },
  REFUNDED: { label: "Refund", color: "error" },
};

export const withdrawalStatusMeta: Record<
  WithdrawalStatus,
  { label: string; color: BadgeColor }
> = {
  REQUESTED: { label: "Menunggu", color: "warning" },
  PROCESSING: { label: "Diproses", color: "info" },
  PAID: { label: "Berhasil", color: "success" },
  FAILED: { label: "Gagal", color: "error" },
  CANCELLED: { label: "Dibatalkan", color: "neutral" },
  REJECTED: { label: "Ditolak", color: "error" },
};
