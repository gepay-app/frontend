// app/types/donation.ts
// Kontrak tipe modul `donation` (halaman donasi, donasi, overlay). Disinkron
// manual ke DTO backend (../backend/src/main/java/.../donation/**). Kalau
// backend ganti field, ubah di sini di perubahan yang sama.
import type { ChannelType } from "./payment";

// Pagination keyset (cursor) yang dipakai backend di beberapa endpoint list.
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
}

export type DonationType = "TEXT" | "YOUTUBE";
export type DonationStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";
export type OverlayEventStatus =
  | "PENDING"
  | "PLAYING"
  | "PLAYED"
  | "SKIPPED"
  | "FAILED";

// Halaman donasi publik (GET /donation-pages/{slug}) — tanpa overlayKey.
export interface PublicDonationPage {
  id: string;
  creatorId: string;
  slug: string;
  displayName: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
}

// Halaman milik creator (GET /donations/me/page) — plus overlayKey & updatedAt.
export interface DonationPage extends PublicDonationPage {
  overlayKey: string;
  updatedAt: string;
}

export interface UpdateDonationPagePayload {
  displayName?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
}

export interface CreateDonationPayload {
  idempotencyKey: string;
  creatorId: string;
  amount: number;
  donorName?: string;
  donorEmail?: string;
  channelCode: string;
  type: DonationType;
  message?: string;
  videoUrl?: string;
  isAnonymous: boolean;
}

// View donasi publik (POST /donations & GET /donations/{id}).
export interface Donation {
  donationId: string;
  creatorId: string;
  status: DonationStatus;
  type: DonationType;
  amount: number;
  totalChargedAmount: number | null;
  channelCode: string;
  message: string | null;
  videoId: string | null;
  paymentReferenceNumber: string | null;
  paymentExpiresAt: string | null;
  createdAt: string;
  paidAt: string | null;
}

// Item feed donasi creator (GET /donations/me), sudah termasuk donor + pesan.
export interface CreatorDonation {
  donationId: string;
  status: DonationStatus;
  type: DonationType;
  amount: number;
  totalChargedAmount: number | null;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  message: string | null;
  videoId: string | null;
  channelCode: string;
  createdAt: string;
  paidAt: string | null;
}

// Item antrean overlay (GET /donations/overlay/queue).
export interface OverlayQueueItem {
  overlayEventId: string;
  donationId: string;
  type: DonationType;
  status: OverlayEventStatus;
  amount: number;
  donorName: string | null;
  durationSeconds: number;
  attempts: number;
  createdAt: string;
  playedAt: string | null;
}

// Payload pesan WebSocket `play` ke display (data di dalam envelope).
export interface OverlayPlayPayload {
  overlayEventId: string;
  donationId: string;
  type: DonationType;
  donorName: string;
  isAnonymous: boolean;
  amount: number;
  durationSeconds: number;
  message: string | null;
  videoId: string | null;
  canonicalUrl: string | null;
}

// Channel PAYIN publik (GET /channels/payin) — fee yang ditanggung donor per
// channel. Fee platform sengaja TIDAK ada di response ini (bagian creator).
export interface PayinChannel {
  id: number;
  code: string;
  displayName: string;
  type: ChannelType;
  direction: "PAYIN";
  minAmount: number;
  maxAmount: number;
  // null kalau request tanpa param `amount`.
  pgFeeAmount: number | null;
  totalChargedAmount: number | null;
  currency: string;
}

// Channel PAYOUT (GET /channels/payout) — auth; fee memperhitungkan
// UserFeeOverride user (mis. creator VIP).
export interface PayoutChannel {
  id: number;
  code: string;
  displayName: string;
  type: ChannelType;
  direction: "PAYOUT";
  minAmount: number;
  maxAmount: number;
  withdrawalFeeAmount: number;
  feePercentageBps: number;
  currency: string;
}
