// types/auth.ts
// HARUS disinkron manual ke identity.api.dtos di backend — gak ada codegen.
// Kalau backend nambah role baru, ubah array ROLES di sini juga.

export const ROLES = ["SUPER_ADMIN", "ADMIN", "CREATOR", "USER"] as const;
export type Role = (typeof ROLES)[number];

export type UserStatus = "ACTIVE" | "DISABLED";

// Samain ke identity.api.dtos.UserPrincipal — ini yang dibalikin GET /me
// name boleh null (Firebase gak jamin displayName).
export interface UserPrincipal {
  userId: string;
  email: string;
  name: string | null;
  roles: Role[];
  status: UserStatus;
}
