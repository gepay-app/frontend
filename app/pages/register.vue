<script lang="ts" setup>
import { z } from 'zod'
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: false,
})

const schema = z.object({
  name: z.string().max(100, "Nama maksimal 100 karakter").optional(),
  email: z.email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});
type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ name: "", email: "", password: "" });
const errorMessage = ref("")
const successMessage = ref("")
const showPassword = ref(false)
const loading = ref(false)

const { registerWithEmail } = useAuth()
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  errorMessage.value = ""
  successMessage.value = ""
  loading.value = true
  try {
    await registerWithEmail(
      event.data.name ?? "",
      event.data.email,
      event.data.password,
    )
    successMessage.value =
      "Akun dibuat. Cek email untuk verifikasi, lalu masuk."
    toast.add({
      title: "Akun dibuat",
      description: "Cek inbox untuk verifikasi email.",
      color: "success",
    })
    await navigateTo("/login")
  } catch (e) {
    errorMessage.value =
      e instanceof AuthError ? e.message : "Gagal mendaftar. Coba lagi."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-lg font-semibold">Daftar</h1>
      </template>

      <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" class="mb-4" />
      <UAlert v-if="successMessage" color="success" variant="soft" :title="successMessage" class="mb-4" />

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Nama" name="name">
          <UInput v-model="state.name" placeholder="Nama kamu (opsional)" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" type="email" placeholder="email@kamu.com" required class="w-full" />
        </UFormField>

        <UFormField label="Kata sandi" name="password" required>
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

        <UButton type="submit" block :loading="loading">Daftar</UButton>
      </UForm>

      <p class="mt-4 text-center text-sm text-muted">
        Sudah punya akun?
        <UButton variant="link" size="sm" :padded="false" to="/login">
          Masuk
        </UButton>
      </p>
    </UCard>
  </div>
</template>
