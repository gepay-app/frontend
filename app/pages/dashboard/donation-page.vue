<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { ApiError } from "~/types/api";

definePageMeta({
  layout: "dashboard",
  middleware: "creator",
});

const toast = useToast();

const { myPage, fetchMyPage, updateMyPage, rotateOverlayKey } = useDonations();

const loading = ref(false);
const submitting = ref(false);
const form = ref();
const origin = ref("");

const state = reactive({
  displayName: "",
  title: "",
  description: "",
  imageUrl: "",
  slug: "",
});

const schema = z.object({
  displayName: z.string().min(1, "Nama tampilan wajib diisi").max(120),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z
    .string()
    .refine((v) => !v || /^https?:\/\/\S+$/.test(v), "URL gambar tidak valid")
    .optional(),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]{3,60}$/,
      "3–60 karakter: huruf kecil, angka, atau tanda hubung",
    ),
});
type Schema = z.output<typeof schema>;

const displayUrl = computed(() =>
  myPage.value && origin.value
    ? `${origin.value}/overlay/${myPage.value.overlayKey}`
    : "",
);
const publicUrl = computed(() =>
  myPage.value ? `/donate/${myPage.value.slug}` : "",
);

// Kunci overlay rahasia: tampilkan tersamar, bisa dibuka sebentar.
const revealKey = ref(false);
const maskedKey = computed(() => {
  const key = myPage.value?.overlayKey ?? "";
  if (!key) return "";
  return revealKey.value ? key : `${key.slice(0, 6)}…${key.slice(-4)}`;
});

function fillState() {
  if (!myPage.value) return;
  state.displayName = myPage.value.displayName ?? "";
  state.title = myPage.value.title ?? "";
  state.description = myPage.value.description ?? "";
  state.imageUrl = myPage.value.imageUrl ?? "";
  state.slug = myPage.value.slug ?? "";
}

async function load() {
  loading.value = true;
  try {
    await fetchMyPage();
    fillState();
  } catch (e) {
    handleApiError(e);
  } finally {
    loading.value = false;
  }
}

function handleApiError(
  e: unknown,
  formRef?: { setErrors: (errors: { name: string; message: string }[]) => void },
) {
  if (e instanceof ApiError) {
    if (formRef && e.errors?.length) {
      formRef.setErrors(
        e.errors.map((err) => ({ name: err.field, message: err.message })),
      );
    }
    toast.add({ title: "Gagal", description: e.message, color: "error" });
    return;
  }
  toast.add({
    title: "Gagal",
    description: "Terjadi kesalahan tak terduga. Coba lagi.",
    color: "error",
  });
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;
  try {
    await updateMyPage({
      displayName: event.data.displayName.trim(),
      title: event.data.title?.trim() || undefined,
      description: event.data.description?.trim() || undefined,
      imageUrl: event.data.imageUrl?.trim() || undefined,
      slug: event.data.slug.trim(),
    });
    fillState();
    toast.add({ title: "Halaman donasi disimpan", color: "success" });
  } catch (e) {
    handleApiError(e, form.value);
  } finally {
    submitting.value = false;
  }
}

// --- Rotasi overlay key (memutus sesi OBS lama) ---
const rotateOpen = ref(false);
const rotating = ref(false);

async function confirmRotate() {
  rotating.value = true;
  try {
    await rotateOverlayKey();
    revealKey.value = true;
    rotateOpen.value = false;
    toast.add({
      title: "Kunci overlay diperbarui",
      description: "Sambungkan ulang OBS dengan URL baru.",
      color: "success",
    });
  } catch (e) {
    handleApiError(e);
  } finally {
    rotating.value = false;
  }
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `${label} disalin`, color: "success" });
  } catch {
    toast.add({ title: "Gagal menyalin", color: "error" });
  }
}

onMounted(() => {
  origin.value = window.location.origin;
  load();
});
</script>

<template>
  <UDashboardPanel id="donation-page">
    <template #header>
      <UDashboardNavbar title="Halaman donasi">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            v-if="myPage"
            :to="publicUrl"
            target="_blank"
            label="Buka halaman publik"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            size="sm"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            aria-label="Muat ulang"
            :loading="loading"
            @click="load"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Form profil halaman -->
        <UCard class="lg:col-span-2">
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">Profil halaman</h2>
              <p class="text-sm text-muted">
                Informasi ini tampil di halaman donasi publik.
              </p>
            </div>
          </template>

          <UForm
            ref="form"
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField name="displayName" label="Nama tampilan" required>
              <UInput
                v-model="state.displayName"
                placeholder="Nama kamu / channel"
                class="w-full"
              />
            </UFormField>

            <UFormField
              name="slug"
              label="Slug"
              help="Alamat halaman: /donate/nama-kamu"
              required
            >
              <UInput
                v-model="state.slug"
                placeholder="nama-kamu"
                class="w-full"
              />
            </UFormField>

            <UFormField name="title" label="Judul">
              <UInput
                v-model="state.title"
                placeholder="Judul halaman (opsional)"
                class="w-full"
              />
            </UFormField>

            <UFormField name="description" label="Deskripsi">
              <UTextarea
                v-model="state.description"
                :rows="4"
                placeholder="Ceritakan halaman donasi kamu (opsional)"
                class="w-full"
              />
            </UFormField>

            <UFormField name="imageUrl" label="URL gambar/avatar">
              <UInput
                v-model="state.imageUrl"
                placeholder="https://..."
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end">
              <UButton
                type="submit"
                label="Simpan"
                :loading="submitting"
              />
            </div>
          </UForm>
        </UCard>

        <!-- Overlay OBS -->
        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">Overlay OBS</h2>
              <p class="text-sm text-muted">
                Tempel URL ini ke Browser Source OBS.
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <div>
              <p class="text-sm text-muted">Kunci overlay</p>
              <div class="mt-1 flex items-center gap-2">
                <code class="min-w-0 flex-1 truncate rounded bg-elevated px-2 py-1 text-sm">
                  {{ maskedKey }}
                </code>
                <UButton
                  :icon="revealKey ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :aria-label="revealKey ? 'Sembunyikan kunci' : 'Tampilkan kunci'"
                  @click="revealKey = !revealKey"
                />
              </div>
            </div>

            <div>
              <p class="text-sm text-muted">URL display</p>
              <div class="mt-1 flex items-center gap-2">
                <code class="min-w-0 flex-1 truncate rounded bg-elevated px-2 py-1 text-sm">
                  {{ displayUrl }}
                </code>
                <UButton
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Salin URL display"
                  :disabled="!displayUrl"
                  @click="copy(displayUrl, 'URL display')"
                />
              </div>
            </div>

            <UAlert
              icon="i-lucide-shield-alert"
              color="warning"
              variant="soft"
              title="Kunci ini rahasia"
              description="Siapa pun yang punya URL ini bisa menampilkan overlay. Rotasi kunci bila bocor — sesi OBS lama akan terputus."
            />

            <UButton
              label="Rotasi kunci overlay"
              icon="i-lucide-refresh-cw"
              color="error"
              variant="outline"
              block
              @click="rotateOpen = true"
            />
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Konfirmasi rotasi kunci -->
  <UModal
    v-model:open="rotateOpen"
    title="Rotasi kunci overlay?"
    description="Sesi OBS yang memakai kunci lama akan langsung terputus dan harus disambungkan ulang dengan URL baru."
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <UButton
        label="Batal"
        color="neutral"
        variant="outline"
        @click="rotateOpen = false"
      />
      <UButton
        label="Rotasi"
        color="error"
        :loading="rotating"
        @click="confirmRotate"
      />
    </template>
  </UModal>
</template>
