// app/middleware/auth.global.ts
import type { User } from "firebase/auth";
import { ApiError } from "~/types/api";

interface AuthErrorFlash {
  code: string;
  message: string;
}

export default defineNuxtRouteMiddleware(async (to) => {
  const authReady = useState("auth-ready");
  const user = useState<User | null>("auth-user");
  const { principal, syncFromBackend } = useCurrentUser();
  const auth = useAuth();
  // Dibawa lintas redirect ke /login tanpa menaruh teks di query string.
  const authError = useState<AuthErrorFlash | null>("auth-error", () => null);

  //1. Firebase butuh sepersekian detik buat restore session dari
  // IndexedDB — tunggu authReady dulu, kalau nggak bakal ada flash-redirect
  // ke /login walau user sebenarnya masih login.
  if (!authReady.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(authReady, (ready) => {
        if (ready) {
          stop();
          resolve();
        }
      });
    });
  }

  const isPublic = to.path === "/login" || to.path === "/register";

  // 2. Firebase user ada tapi principal backend belum ada (misal hard refresh)
  // → tarik /me; kalau gagal, bersihkan sesi Firebase & simpan alasannya.
  if (user.value && !principal.value) {
    try {
      await syncFromBackend();
    } catch (e) {
      authError.value =
        e instanceof ApiError
          ? { code: e.code, message: e.message }
          : { code: "client.error", message: "Gagal memuat sesi. Coba lagi." };
      await auth.logout(false);
      if (!isPublic) return navigateTo("/login");
      return;
    }
  }

  // 3. Tidak ada Firebase user & akses halaman privat → lempar ke /login
  if (!user.value) {
    if (!isPublic) return navigateTo("/login");
    return;
  }

  // 4. Sudah login & principal valid tapi buka /login → lempar ke dashboard
  if (isPublic) {
    return navigateTo("/");
  }
});
