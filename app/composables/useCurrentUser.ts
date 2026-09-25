import { type UserPrincipal, type Role } from "~/types/auth";

// Variable di luar composable untuk menyimpan pemicu promise yang sedang berjalan (In-flight request deduplication)
let syncPromise: Promise<UserPrincipal | null> | null = null;

export const useCurrentUser = () => {
  const { get } = useApi();
  const principal = useState<UserPrincipal | null>("current-user", () => null);
  const loading = useState("current-user-loading", () => false);

  /**
   * WAJIB dipanggil tepat setelah Firebase login sukses (bukan cuma nyimpen
   * token). Request GET /me inilah yang bikin IdentityEnrichmentFilter di
   * backend jalanin provisionOnFirstLogin (auto-provision USER, atau link
   * baris pre-seeded seperti SUPER_ADMIN/creator) — lihat specs/auth.md.
   *
   * Bisa lempar ApiError. Status 401 = email belum terverifikasi / user
   * DISABLED — bukan bug jaringan, harus ditangani beda (lihat pages/login.vue).
   */
  const syncFromBackend = async (): Promise<UserPrincipal | null> => {
    // 1. Jika data sudah ada, langsung kembalikan (mencegah refetch tidak perlu)
    if (principal.value) return principal.value;

    // 2. Jika sedang ada request /me yang berjalan, tumpangi promise yang sama
    if (syncPromise) return syncPromise;

    loading.value = true;

    // 3. Buat request baru dan simpan promisenya
    syncPromise = (async () => {
      try {
        const data = await get<UserPrincipal>("/identities/me");
        principal.value = data;
        return data;
      } finally {
        loading.value = false;
        syncPromise = null; // Clean up setelah selesai
      }
    })();

    return syncPromise;
  };

  const clear = () => {
    principal.value = null;
  };

  // UI-only guard (show/hide tombol dsb). Enforcement asli TETAP di
  // @PreAuthorize backend — jangan pernah anggap ini cukup buat security jgn tolol ye source of truth tetep di backend.
  const hasRole = (role: Role) =>
    principal.value?.roles.includes(role) ?? false;

  return {
    principal: readonly(principal),
    loading: readonly(loading),
    syncFromBackend,
    clear,
    hasRole,
  };
};
