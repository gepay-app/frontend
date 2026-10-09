// app/middleware/admin.ts
// Named middleware, dipasang di parent page `pages/internal.vue` sehingga
// berlaku untuk SEMUA route di bawah /internal/** (Nuxt mengumpulkan middleware
// dari tiap route record yang match — parent + anak).
//
// `auth.global.ts` jalan lebih dulu (global middleware sebelum middleware
// route), jadi principal sudah terisi saat middleware ini berjalan.
export default defineNuxtRouteMiddleware(() => {
  const { hasRole } = useCurrentUser();

  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return navigateTo("/dashboard");
  }
});
