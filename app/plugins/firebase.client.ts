// plugins/firebase.client.ts
// Suffix .client.ts (bukan .ts) — eksplisit cuma jalan di browser, meski
// project ini full SPA. Best practice: jangan andalkan ssr:false doang.

import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  type User,
} from "firebase/auth";

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig().public.firebase;
  const app = getApps().length ? getApps()[0]! : initializeApp(config);
  const auth = getAuth(app);

  // browserLocalPersistence = default Firebase, dieksplisitkan aja biar jelas
  // niatnya "ingat login" — token/refresh-token disimpan Firebase sendiri
  // (IndexedDB), BUKAN localStorage manual.
  await setPersistence(auth, browserLocalPersistence);

  // useState = global reactive state ala Nuxt (mirip Context tapi gak perlu
  // Provider). SSR-safe walau kita SPA — kebiasaan yang sama tetap kepake.
  const user = useState<User | null>("auth-user", () => null);
  const authReady = useState("auth-ready", () => false);

  onAuthStateChanged(auth, (u) => {
    user.value = u;
    authReady.value = true;
  });

  return { provide: { firebaseAuth: auth } };
});
