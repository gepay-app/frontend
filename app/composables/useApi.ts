// app/composables/useApi.ts
import type { ApiResponse, ErrorResponsePayload } from "~/types/api";
import { ApiError } from "~/types/api";

// Prefix versi API ditambahkan terpusat di sini. `apiBase` = origin backend
// (tanpa "/api/v1") supaya nilai yang sama bisa dipakai untuk SSE/WebSocket.
const API_PREFIX = "/api/v1";

export const useApi = () => {
  const { apiBase } = useRuntimeConfig().public;
  const { $firebaseAuth } = useNuxtApp();

  const client = $fetch.create({
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

  // Prefix "/api/v1" ditambahkan di sini, jadi pemanggil cukup menulis path
  // relatif: get("/identities/me").
  const apiPath = (url: string) => `${API_PREFIX}${url}`;

  // Generic helper: otomatis unwrap `data` dari amplop ApiResponse<T>,
  // supaya pemanggil gak perlu `.data` berulang-ulang.
  const get = <T>(url: string, opts?: Record<string, unknown>) =>
    client<ApiResponse<T>>(apiPath(url), { method: "GET", ...opts }).then(
      (r) => r.data,
    );

  const post = <T>(
    url: string,
    body?: unknown,
    opts?: Record<string, unknown>,
  ) =>
    client<ApiResponse<T>>(apiPath(url), {
      method: "POST",
      body: body as any,
      ...opts,
    }).then((r) => r.data);

  const put = <T>(
    url: string,
    body?: unknown,
    opts?: Record<string, unknown>,
  ) =>
    client<ApiResponse<T>>(apiPath(url), {
      method: "PUT",
      body: body as any,
      ...opts,
    }).then((r) => r.data);

  const patch = <T>(
    url: string,
    body?: unknown,
    opts?: Record<string, unknown>,
  ) =>
    client<ApiResponse<T>>(apiPath(url), {
      method: "PATCH",
      body: body as any,
      ...opts,
    }).then((r) => r.data);

  // Beberapa endpoint balikin `data: null` (mis. DELETE), makanya T boleh void.
  const del = <T = void>(url: string, opts?: Record<string, unknown>) =>
    client<ApiResponse<T>>(apiPath(url), {
      method: "DELETE",
      ...opts,
    }).then((r) => r.data);

  return { client, get, post, put, patch, del };
};
