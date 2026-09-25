// app/composables/useApi.ts
import type { ApiResponse, ErrorResponsePayload } from "~/types/api";
import { ApiError } from "~/types/api";

export const useApi = () => {
  const { apiBase } = useRuntimeConfig().public;
  const { $firebaseAuth } = useNuxtApp();

  const client = $fetch.create({
    // apiBase sudah termasuk prefix versi (".../api/v1"), jadi pemanggil cukup
    // menulis path relatif: get("/identities/me").
    baseURL: apiBase,
    async onRequest({ options }) {
      // getIdToken() tanpa argumen = pakai token cache kalau masih valid,
      // auto-refresh kalau mau expired (~<5 menit sisa). Gak perlu logic
      // refresh manual sama sekali.
      const token = await $firebaseAuth.currentUser?.getIdToken();
      if (token) {
        const headers = new Headers(options.headers);
        headers.set("Authorization", `Bearer ${token}`);
        options.headers = headers;
      }
    },
    async onResponseError({ response }) {
      // Backend SELALU balikin ErrorResponse JSON pas gagal (GlobalExceptionHandler)
      const payload = response._data as ErrorResponsePayload | undefined;
      if (payload?.code) {
        throw new ApiError(response.status, payload);
      }
      // fallback kalau body bukan JSON ErrorResponse (mis. 502 dari proxy/nginx)
      throw new ApiError(response.status, {
        code: "unknown",
        message: "Terjadi kesalahan tak terduga.",
        errors: null,
      });
    },
  });

  // Generic helper: otomatis unwrap `data` dari amplop ApiResponse<T>,
  // supaya pemanggil gak perlu `.data` berulang-ulang.
  const get = <T>(url: string, opts?: Record<string, unknown>) =>
    client<ApiResponse<T>>(url, { method: "GET", ...opts }).then((r) => r.data);

  const post = <T>(
    url: string,
    body?: unknown,
    opts?: Record<string, unknown>,
  ) =>
    client<ApiResponse<T>>(url, {
      method: "POST",
      body: body as any,
      ...opts,
    }).then((r) => r.data);

  return { client, get, post };
};
