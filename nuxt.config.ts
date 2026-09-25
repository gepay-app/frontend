// https://nuxt.com/docs/api/configuration/nuxt-config

// `NUXT_PUBLIC_API_BASE_URL` = URL backend (mis. http://localhost:8080, boleh
// sudah termasuk "/api/v1"). Prefix versi API disematkan di sini supaya
// pemanggil cukup menulis path relatif ("/identities/me") dan tidak dobel.
const apiOrigin = (
  process.env.NUXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/+$/, "");
const apiBase = apiOrigin.endsWith("/api/v1")
  ? apiOrigin
  : `${apiOrigin}/api/v1`;

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  ssr: false,
  spaLoadingTemplate: true,
  hooks: {
    "prerender:routes"({ routes }) {
      routes.clear;
    },
  },
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
      apiBase, // sudah termasuk /api/v1
    },
  },
});
