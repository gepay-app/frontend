// app/utils/donation-status.ts
// Metadata tampilan status donasi & overlay. Label Indonesia + warna badge
// semantik Nuxt UI. Dipakai feed donasi, halaman pembayaran, dan overlay.
import type { BadgeColor } from "./payment-status";
import type { DonationStatus, OverlayEventStatus } from "~/types/donation";

export const donationStatusMeta: Record<
  DonationStatus,
  { label: string; color: BadgeColor }
> = {
  PENDING: { label: "Menunggu", color: "warning" },
  PAID: { label: "Berhasil", color: "success" },
  EXPIRED: { label: "Kedaluwarsa", color: "neutral" },
  FAILED: { label: "Gagal", color: "error" },
};

export const overlayStatusMeta: Record<
  OverlayEventStatus,
  { label: string; color: BadgeColor }
> = {
  PENDING: { label: "Menunggu", color: "warning" },
  PLAYING: { label: "Diputar", color: "info" },
  PLAYED: { label: "Selesai", color: "success" },
  SKIPPED: { label: "Dilewati", color: "neutral" },
  FAILED: { label: "Gagal", color: "error" },
};
