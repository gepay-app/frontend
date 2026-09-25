// types/api.ts

// Samain field-nya 1:1 sama ApiResponse<T> (Java record) di backend
export interface ApiResponse<T> {
  message: string | null;
  data: T;
}

// Samain field-nya 1:1 sama ValidationError
export interface ValidationError {
  field: string;
  message: string;
}

// Samain field-nya 1:1 sama ErrorResponse — body ini SELALU dikirim
// GlobalExceptionHandler tiap kali request gagal.
export interface ErrorResponsePayload {
  code: string; // = message key backend, mis. "http.unauthorized" — pakai ini buat branching logic, JANGAN parse `message`
  message: string; // teks siap-tampil (toast/banner)
  errors: ValidationError[] | null; // cuma keisi pas validasi 400
}

/**
 * Dibungkus jadi Error class (bukan cuma interface) supaya:
 * - bisa di-`throw`
 * - bisa `instanceof ApiError` di catch block
 * - `status` HTTP ikut kebawa, gak cuma dari body
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly errors: ValidationError[] | null;

  constructor(status: number, payload: ErrorResponsePayload) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.status = status;
    this.errors = payload.errors;
  }

  /** Bandingin ke message key backend, mis. err.is('identity.role.branch_id_required') */
  is(code: string): boolean {
    return this.code === code;
  }
}
