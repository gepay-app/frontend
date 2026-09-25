<script lang="ts" setup>
import { z } from 'zod'
import type { FormSubmitEvent } from "@nuxt/ui";
import { ApiError } from "~/types/api";

definePageMeta({
  layout: false,
})

const schema = z.object({
  email: z
    .email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ email: "", password: "" });
const errorMessage = ref("")
const showPassword = ref(false)
const loading = ref(false)

const { loginWithGoogle, loginWithCredentials, logout, sendResetPassword } = useAuth();
const { syncFromBackend } = useCurrentUser()
const toast = useToast()

// Pesan error yang dibawa middleware lintas-redirect (tanpa query string).
const authError = useState<{ code: string; message: string } | null>("auth-error", () => null)

// Backend sengaja membalas 401 generik ("Unauthorized") demi anti-enumeration.
// Di alur login, penyebab paling umum adalah email belum diverifikasi, jadi
// frontend memberi hint. Error lain (mis. 403 akun disuspend) tampilkan pesan
// backend apa adanya.
const displayMessage = (code: string, message: string) =>
  code === "http.unauthorized"
    ? "Email belum diverifikasi. Cek inbox verifikasi, lalu coba masuk lagi."
    : message

if (authError.value) {
  errorMessage.value = displayMessage(authError.value.code, authError.value.message)
  authError.value = null
}

async function onSumbit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ""
  loading.value = true
  try {
    await loginWithCredentials(state.email, state.password)
    await postLoginSync();
  } catch (e) {
    errorMessage.value =
      e instanceof AuthError ? e.message : "Terjadi kesalahan saat login. Coba lagi.";
  } finally {
    loading.value = false
  }
}

async function loginGoogle() {
  errorMessage.value = "";
  loading.value = true;
  try {
    await loginWithGoogle();
    await postLoginSync();
  } catch (e) {
    errorMessage.value =
      e instanceof AuthError ? e.message : "Terjadi kesalahan saat login. Coba lagi.";
  } finally {
    loading.value = false;
  }
}



// Titik paling krusial di seluruh flow: /me yang trigger provisionOnFirstLogin.
// Gagal → WAJIB signOut() Firebase, kalau nggak sesi Firebase tetap "hidup"
// padahal app nolak dia terus. Pesan diambil dari backend (ter-i18n), kecuali
// 401 yang dibuat hint khusus di displayMessage().
async function postLoginSync() {
  try {
    await syncFromBackend();
    await navigateTo("/");
  } catch (e) {
    await logout();
    errorMessage.value =
      e instanceof ApiError
        ? displayMessage(e.code, e.message)
        : "Gagal memuat data akun. Coba lagi.";
  }
}

const showResetForm = ref(false);
const resetEmail = ref("");

async function onSendReset() {
  try {
    await sendResetPassword(resetEmail.value);
    toast.add({
      title: "Email terkirim",
      description: "Cek inbox untuk atur kata sandi.",
      color: "success",
    });
    showResetForm.value = false;
  } catch (e) {
    toast.add({
      title: "Gagal",
      description: e instanceof AuthError ? e.message : "Coba lagi.",
      color: "error",
    });
  }
}

</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-lg font-semibold">Masuk</h1>
      </template>

      <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" class="mb-4" />

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSumbit">
        <UFormField label="Email" name="email" type="email" required>
          <UInput v-model="state.email" type="email" placeholder="email@kamu.com" required class="w-full" />
        </UFormField>

        <UFormField label="Kata sandi" name="password">
          <UInput v-model="state.password" placeholder="Password" :type="showPassword ? 'text' : 'password'"
            :ui="{ trailing: 'pe-1' }" class="w-full" required>
            <template #trailing>
              <UButton color="neutral" variant="link" size="sm"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? 'Hide password' : 'Show password'" :aria-pressed="showPassword"
                aria-controls="password" @click="showPassword = !showPassword" />
            </template>
          </UInput>
        </UFormField>

        <UButton type="submit" block :loading="loading">Masuk</UButton>
      </UForm>

      <USeparator label="atau" class="my-4" />

      <UButton icon="logos:google-icon" variant="outline" block :loading="loading" @click="loginGoogle">
        Masuk dengan Google
      </UButton>

      <UButton variant="link" size="sm" class="mt-2" @click="showResetForm = true">
        Lupa kata sandi?
      </UButton>

      <p class="mt-4 text-center text-sm text-muted">
        Belum punya akun?
        <UButton variant="link" size="sm" :padded="false" to="/register">
          Daftar
        </UButton>
      </p>

      <UModal v-model:open="showResetForm">
        <template #content>
          <UCard>
            <template #header>Reset kata sandi</template>
            <p class="text-sm text-muted mb-3">
              Masukkan email akun kamu. Kami kirim link untuk atur ulang kata
              sandi.
            </p>
            <UInput v-model="resetEmail" type="email" placeholder="Email" class="w-full mb-3" />
            <UButton block @click="onSendReset">Kirim link</UButton>
          </UCard>
        </template>
      </UModal>
    </UCard>
  </div>
</template>


<style></style>