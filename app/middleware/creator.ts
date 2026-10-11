// app/middleware/creator.ts
// Named middleware untuk halaman area creator (mis. /dashboard/payouts).
// `auth.global.ts` jalan lebih dulu (global middleware), jadi principal sudah
// terisi saat middleware ini berjalan. Ini guard UI; enforcement asli tetap
// @PreAuthorize("hasRole('CREATOR')") di backend.
export default defineNuxtRouteMiddleware(() => {
  const { hasRole } = useCurrentUser();

  if (!hasRole("CREATOR")) {
    return navigateTo("/dashboard");
  }
});
