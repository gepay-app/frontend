// app/types/payment.ts
// Sinkron manual ke payment.api.dtos + payment.api.enums di backend —
// tidak ada codegen. Kalau backend ganti field, ubah di sini di perubahan yang sama.

export type ChannelDirection = "PAYIN" | "PAYOUT";

export type ChannelType =
  | "VA"
  | "QRIS"
  | "EWALLET"
  | "BANK_TRANSFER"
  | "PAYOUT_BANK"
  | "PAYOUT_EWALLET";

// payment.api.dtos.ChannelResponse — katalog mentah tanpa fee.
// @deprecated endpoint `GET /channels?direction=` sudah deprecated; pakai
// `PayinChannel` / `PayoutChannel` di `~/types/donation`.
export interface Channel {
  id: number;
  code: string;
  displayName: string;
  type: ChannelType;
  direction: ChannelDirection;
}

// payment.api.dtos.PayoutDestinationResponse
export interface PayoutDestination {
  id: string;
  channelId: number;
  accountNumber: string;
  accountName: string;
  bankCode: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export type WithdrawalStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REJECTED";

// payment.api.dtos.WithdrawalResponse
export interface Withdrawal {
  id: string;
  idempotencyKey: string;
  userId: string;
  destinationId: string;
  channelRouteId: number;
  status: WithdrawalStatus;
  requestedAmount: number;
  withdrawalFeeAmount: number;
  netDisbursementAmount: number;
  destinationAccountNumber: string;
  destinationAccountName: string;
  destinationBankCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

// payment.api.dtos.BalanceResponse
export interface Balance {
  pending: number;
  available: number;
  withdrawalPayable: number;
  currency: string;
}

// payment.api.dtos.WithdrawalConfigResponse
export interface WithdrawalConfig {
  minAmount: number; // 0 = tanpa batas min (praktik: backend selalu > 0)
  maxAmount: number; // 0 = tanpa batas atas
  fixedFee: number;
  feePercentageBps: number;
  currency: string;
}

export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

// payment.api.dtos.PaymentResponse
export interface Payment {
  id: string;
  idempotencyKey: string;
  type: string;
  status: PaymentStatus;
  userId: string;
  payerId: string | null;
  providerId: number | null;
  channelId: number | null;
  channelRouteId: number | null;
  grossAmount: number;
  pgFeeAmount: number;
  platformFeeAmount: number;
  totalChargedAmount: number;
  netCreatorAmount: number;
  createdAt: string;
  paidAt: string | null;
}

// internal.delivery.http.req.CreatePayoutDestinationRequest
export interface CreatePayoutDestinationPayload {
  channelId: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
}

// internal.delivery.http.req.CreateWithdrawalRequest
export interface CreateWithdrawalPayload {
  idempotencyKey: string;
  destinationId: string;
  requestedAmount: number;
}
