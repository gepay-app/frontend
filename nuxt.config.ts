// https://nuxt.com/docs/api/configuration/nuxt-config

// `NUXT_PUBLIC_API_BASE_URL` = **origin** backend tanpa prefix versi
// (mis. http://localhost:8080). Prefix `/api/v1` ditambahkan terpusat di
// `useApi` supaya satu nilai origin ini bisa dipakai untuk HTTP, SSE, dan
// WebSocket (`/ws/...`). Kalau env terlanjur menyertakan `/api/v1`, dibuang.
const apiBase = (process.env.NUXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080")
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  ssr: false,
  spaLoadingTemplate: true,
  hooks: {},
  runtimeConfig: {
    public: {
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      },
      apiBase,
    },
  },
});
