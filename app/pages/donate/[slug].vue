<script setup lang="ts">
import { z } from "zod";
import { renderSVG } from "uqr";
import type { FormSubmitEvent } from "@nuxt/ui";
import { ApiError } from "~/types/api";
import type { DonationType } from "~/types/donation";

definePageMeta({ layout: false });

const route = useRoute();
const router = useRouter();
const toast = useToast();
const slug = computed(() => String(route.params.slug));

const {
  page: donationPage,
  channels,
  donation,
  status,
  submitting,
  fetchPage,
  fetchChannels,
  create,
  fetchStatus,
  watchStatus,
  stopPolling,
  closeStream,
} = useDonationCheckout();

const notFound = ref(false);
const loading = ref(false);
const form = ref();

const state = reactive<{
  amount?: number;
  type: DonationType;
  channelCode?: string;
  donorName: string;
  donorEmail: string;
  message: string;
  videoUrl: string;
  isAnonymous: boolean;
}>({
  amount: undefined,
  type: "TEXT",
  channelCode: undefined,
  donorName: "",
  donorEmail: "",
  message: "",
  videoUrl: "",
  isAnonymous: false,
});

function isYouTubeUrl(url: string) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}/.test(
    url.trim(),
  );
}

const schema = computed(() =>
  z
    .object({
      amount: z.number({ error: "Nominal wajib diisi" }).min(1, "Minimal Rp1"),
      type: z.enum(["TEXT", "YOUTUBE"]),
      channelCode: z.string().min(1, "Pilih metode pembayaran"),
      donorName: z.string().max(120).optional(),
      donorEmail: z
        .string()
        .refine(
          (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
          "Format email tidak valid",
        )
        .optional(),
      message: z.string().optional(),
      videoUrl: z.string().optional(),
      isAnonymous: z.boolean(),
    })
    .superRefine((val, ctx) => {
      if (val.type === "TEXT") {
        const message = val.message?.trim() ?? "";
        if (!message) {
          ctx.addIssue({
            code: "custom",
            path: ["message"],
            message: "Pesan wajib diisi untuk tipe pesan teks",
          });
        } else if (message.length > 350) {
          ctx.addIssue({
            code: "custom",
            path: ["message"],
            message: "Pesan maksimal 350 karakter",
          });
        }
        if (val.videoUrl?.trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["videoUrl"],
            message: "URL video tidak dipakai untuk tipe pesan teks",
          });
        }
      } else {
        const url = val.videoUrl?.trim() ?? "";
        if (!url) {
          ctx.addIssue({
            code: "custom",
            path: ["videoUrl"],
            message: "URL YouTube wajib diisi",
          });
        } else if (!isYouTubeUrl(url)) {
          ctx.addIssue({
            code: "custom",
            path: ["videoUrl"],
            message: "URL YouTube tidak valid",
          });
        }
      }
    }),
);
type Schema = z.output<typeof schema>;

const typeItems = [
  { label: "Pesan teks", value: "TEXT" },
  { label: "Video YouTube", value: "YOUTUBE" },
];

const channelItems = computed(() =>
  channels.value.map((channel) => ({
    label:
      channel.pgFeeAmount != null && channel.pgFeeAmount > 0
        ? `${channel.displayName} · +${formatIdr(channel.pgFeeAmount)}`
        : channel.displayName,
    value: channel.code,
  })),
);

const selectedChannel = computed(
  () => channels.value.find((c) => c.code === state.channelCode) ?? null,
);

// Fee & total hanya ditampilkan; angkanya murni dari backend (jangan dihitung FE).
const selectedFee = computed(() => selectedChannel.value?.pgFeeAmount ?? null);
const selectedTotal = computed(
  () => selectedChannel.value?.totalChargedAmount ?? null,
);

async function load(slugValue: string) {
  loading.value = true;
  notFound.value = false;
  try {
    await fetchPage(slugValue);
    await fetchChannels(state.amount);
  } catch (e) {
    if (e instanceof ApiError && e.is("donation.page_not_found")) {
      notFound.value = true;
    } else {
      toast.add({
        title: "Gagal memuat halaman",
        description: e instanceof Error ? e.message : "Coba lagi.",
        color: "error",
      });
    }
  } finally {
    loading.value = false;
  }
}

// Perbarui fee per channel saat nominal berubah (debounce ringan).
let amountTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => state.amount,
  (value) => {
    if (amountTimer) clearTimeout(amountTimer);
    amountTimer = setTimeout(() => {
      void fetchChannels(value).catch(() => {});
    }, 400);
  },
);

// Idempotency: kunci dibuat sekali per intent & dipakai ulang saat retry.
let pendingKey: string | null = null;

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!donationPage.value) return;
  submitting.value = true;
  try {
    if (!pendingKey) pendingKey = newIdempotencyKey();
    const data = event.data;
    const created = await create({
      idempotencyKey: pendingKey,
      creatorId: donationPage.value.creatorId,
      amount: data.amount,
      donorName: data.isAnonymous ? undefined : data.donorName?.trim() || undefined,
      donorEmail: data.donorEmail?.trim() || undefined,
      channelCode: data.channelCode,
      type: data.type,
      message: data.type === "TEXT" ? data.message?.trim() : undefined,
      videoUrl: data.type === "YOUTUBE" ? data.videoUrl?.trim() : undefined,
      isAnonymous: data.isAnonymous,
    });
    // Simpan id donasi di URL supaya refresh tetap di langkah pembayaran.
    router.replace({ query: { ...route.query, donation: created.donationId } });
    watchStatus(created.donationId);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.errors?.length) {
        form.value?.setErrors(
          e.errors.map((err) => ({ name: err.field, message: err.message })),
        );
      }
      toast.add({ title: "Gagal", description: e.message, color: "error" });
    } else {
      toast.add({
        title: "Gagal",
        description: "Terjadi kesalahan tak terduga. Coba lagi.",
        color: "error",
      });
    }
  } finally {
    submitting.value = false;
  }
}

function retryDonation() {
  stopPolling();
  closeStream();
  donation.value = null;
  status.value = null;
  pendingKey = null;
  // Buang id donasi dari URL supaya kembali ke form donasi.
  const { donation: _omit, ...query } = route.query;
  router.replace({ query });
}

// --- Tampilan pembayaran ---
const paymentChannel = computed(
  () =>
    channels.value.find((c) => c.code === donation.value?.channelCode) ?? null,
);
const isQris = computed(() => paymentChannel.value?.type === "QRIS");
const qrSvg = computed(() => {
  const reference = donation.value?.paymentReferenceNumber;
  if (!reference || !isQris.value) return "";
  try {
    return renderSVG(reference, { pixelSize: 8 });
  } catch {
    return "";
  }
});

const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | null = null;
const remainingMs = computed(() => {
  const expiresAt = donation.value?.paymentExpiresAt;
  if (!expiresAt) return 0;
  return Math.max(new Date(expiresAt).getTime() - now.value, 0);
});
const remainingLabel = computed(() => {
  const totalSeconds = Math.floor(remainingMs.value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
});

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `${label} disalin`, color: "success" });
  } catch {
    toast.add({ title: "Gagal menyalin", color: "error" });
  }
}

// Kembalikan langkah pembayaran setelah refresh: id donasi ada di query `?donation=`.
async function restoreIfNeeded() {
  const id = route.query.donation;
  if (typeof id !== "string" || !id) return;
  try {
    const fresh = await fetchStatus(id);
    if (fresh.status === "PENDING") watchStatus(id);
  } catch {
    const { donation: _omit, ...query } = route.query;
    router.replace({ query });
  }
}

watch(slug, async (value) => {
  stopPolling();
  closeStream();
  donation.value = null;
  status.value = null;
  await load(value);
  await restoreIfNeeded();
});

onMounted(async () => {
  clock = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  await load(slug.value);
  await restoreIfNeeded();
});

onBeforeUnmount(() => {
  if (clock) clearInterval(clock);
  if (amountTimer) clearTimeout(amountTimer);
});

useSeoMeta({
  title: () => donationPage.value?.title || "Donasi",
});
</script>

<template>
  <div class="min-h-screen bg-default">
    <div class="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <!-- Belum termuat -->
      <div v-if="notFound" class="py-16">
        <UEmpty
          icon="i-lucide-search-x"
          title="Halaman tidak ditemukan"
          description="Slug halaman donasi tidak valid atau sudah tidak aktif."
        />
      </div>

      <div v-else-if="!donationPage" class="py-16">
        <div class="flex justify-center">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
        </div>
      </div>

      <template v-else>
        <!-- Profil creator -->
        <div class="mb-6 flex items-center gap-4">
          <UAvatar
            :src="donationPage.imageUrl ?? undefined"
            :alt="donationPage.displayName"
            size="xl"
          />
          <div class="min-w-0">
            <h1 class="truncate text-xl font-semibold text-highlighted">
              {{ donationPage.title || donationPage.displayName }}
            </h1>
            <p v-if="donationPage.description" class="mt-1 text-sm text-muted">
              {{ donationPage.description }}
            </p>
          </div>
        </div>

        <UAlert
          v-if="!donationPage.active"
          icon="i-lucide-circle-slash"
          color="warning"
          variant="soft"
          title="Donasi sedang ditutup"
          description="Creator belum menerima donasi saat ini."
          class="mb-6"
        />

        <!-- Status sukses -->
        <UCard v-if="status === 'PAID'">
          <div class="flex flex-col items-center gap-3 py-6 text-center">
            <UIcon name="i-lucide-circle-check-big" class="size-12 text-success" />
            <h2 class="text-lg font-semibold text-highlighted">Terima kasih!</h2>
            <p class="text-sm text-muted">
              Donasi kamu sebesar {{ formatIdr(donation?.amount ?? 0) }} sudah diterima.
            </p>
            <UButton
              v-if="donationPage"
              :to="`/donate/${donationPage.slug}`"
              label="Donasi lagi"
              color="neutral"
              variant="outline"
              @click="retryDonation"
            />
          </div>
        </UCard>

        <!-- Instruksi pembayaran -->
        <UCard v-else-if="donation">
          <template #header>
            <h2 class="font-semibold text-highlighted">Selesaikan pembayaran</h2>
          </template>

          <div class="space-y-5">
            <div class="rounded-lg bg-elevated p-4">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">Metode</span>
                <span class="font-medium text-highlighted">
                  {{ paymentChannel?.displayName ?? donation.channelCode }}
                </span>
              </div>
              <div class="mt-2 flex items-center justify-between text-sm">
                <span class="text-muted">Nominal donasi</span>
                <span class="tabular-nums">{{ formatIdr(donation.amount) }}</span>
              </div>
              <div
                v-if="donation.totalChargedAmount != null"
                class="mt-2 flex items-center justify-between font-medium text-highlighted"
              >
                <span>Total bayar</span>
                <span class="tabular-nums">
                  {{ formatIdr(donation.totalChargedAmount) }}
                </span>
              </div>
            </div>

            <!-- QRIS: render QR dari string EMVCo -->
            <div v-if="isQris" class="flex flex-col items-center gap-3">
              <div
                v-if="qrSvg"
                class="rounded-xl bg-white p-3"
                v-html="qrSvg"
              />
              <p class="text-sm text-muted">
                Pindai QR dengan aplikasi bank / e-wallet.
              </p>
            </div>

            <!-- VA / lainnya: tampilkan nomor referensi -->
            <div v-else-if="donation.paymentReferenceNumber">
              <p class="text-sm text-muted">Nomor pembayaran</p>
              <div class="mt-1 flex items-center gap-2">
                <code class="min-w-0 flex-1 truncate rounded bg-elevated px-2 py-2 text-lg">
                  {{ donation.paymentReferenceNumber }}
                </code>
                <UButton
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="ghost"
                  aria-label="Salin nomor pembayaran"
                  @click="copy(donation.paymentReferenceNumber, 'Nomor pembayaran')"
                />
              </div>
            </div>

            <p
              v-if="status === 'PENDING'"
              class="flex items-center gap-2 text-sm text-muted"
            >
              <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
              <span v-if="remainingMs > 0">
                Menunggu pembayaran · kedaluwarsa dalam {{ remainingLabel }}
              </span>
              <span v-else>Menunggu pembayaran…</span>
            </p>

            <div v-if="status === 'EXPIRED' || status === 'FAILED'" class="space-y-3">
              <UAlert
                :icon="status === 'EXPIRED' ? 'i-lucide-timer-off' : 'i-lucide-circle-x'"
                color="error"
                variant="soft"
                :title="status === 'EXPIRED' ? 'Pembayaran kedaluwarsa' : 'Pembayaran gagal'"
                description="Silakan buat donasi baru."
              />
              <UButton
                label="Coba lagi"
                color="neutral"
                variant="outline"
                block
                @click="retryDonation"
              />
            </div>
          </div>
        </UCard>

        <!-- Form donasi -->
        <UCard v-else>
          <template #header>
            <h2 class="font-semibold text-highlighted">Kirim donasi</h2>
          </template>

          <UForm
            ref="form"
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField name="amount" label="Nominal donasi" required>
              <UInputNumber
                v-model="state.amount"
                :min="1"
                :increment="false"
                :decrement="false"
                :format-options="{
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                }"
                locale="id-ID"
                placeholder="0"
                class="w-full"
                :disabled="!donationPage.active"
              />
            </UFormField>

            <UFormField name="channelCode" label="Metode pembayaran" required>
              <USelect
                v-model="state.channelCode"
                :items="channelItems"
                placeholder="Pilih metode"
                class="w-full"
                :loading="loading"
                :disabled="!donationPage.active"
              />
            </UFormField>

            <dl
              v-if="state.channelCode"
              class="space-y-1 rounded-lg bg-elevated p-3 text-sm"
            >
              <div class="flex justify-between">
                <dt class="text-muted">Biaya layanan</dt>
                <dd class="tabular-nums">
                  {{ selectedFee != null ? formatIdr(selectedFee) : "—" }}
                </dd>
              </div>
              <div class="flex justify-between font-medium text-highlighted">
                <dt>Total bayar</dt>
                <dd class="tabular-nums">
                  {{ selectedTotal != null ? formatIdr(selectedTotal) : "Isi nominal" }}
                </dd>
              </div>
            </dl>

            <UFormField name="type" label="Tipe donasi" required>
              <URadioGroup
                v-model="state.type"
                :items="typeItems"
                orientation="horizontal"
              />
            </UFormField>

            <UFormField
              v-if="state.type === 'TEXT'"
              name="message"
              label="Pesan"
              :help="`${state.message.length}/350`"
              required
            >
              <UTextarea
                v-model="state.message"
                :rows="3"
                :maxlength="350"
                placeholder="Tulis pesan untuk creator"
                class="w-full"
              />
            </UFormField>

            <UFormField
              v-else
              name="videoUrl"
              label="URL video YouTube"
              required
            >
              <UInput
                v-model="state.videoUrl"
                placeholder="https://youtu.be/..."
                class="w-full"
              />
            </UFormField>

            <UFormField name="isAnonymous">
              <USwitch
                v-model="state.isAnonymous"
                label="Donasi sebagai anonim"
              />
            </UFormField>

            <template v-if="!state.isAnonymous">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <UFormField name="donorName" label="Nama (opsional)">
                  <UInput
                    v-model="state.donorName"
                    placeholder="Nama kamu"
                    class="w-full"
                  />
                </UFormField>
                <UFormField name="donorEmail" label="Email (opsional)">
                  <UInput
                    v-model="state.donorEmail"
                    type="email"
                    placeholder="email@contoh.com"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </template>

            <UButton
              type="submit"
              label="Lanjut ke pembayaran"
              icon="i-lucide-arrow-right"
              :loading="submitting"
              :disabled="!donationPage.active"
              block
            />
          </UForm>
        </UCard>

        <p class="mt-6 text-center text-xs text-muted">
          Pembayaran aman diproses oleh penyedia pembayaran.
        </p>
      </template>
    </div>
  </div>
</template>
