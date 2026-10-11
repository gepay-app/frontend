<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { ApiError } from "~/types/api";
import type { PayoutDestination } from "~/types/payment";

definePageMeta({
  layout: "dashboard",
  middleware: "creator",
});

// Batas nominal & biaya diambil dari backend (`GET /withdrawals/config`),
// supaya FE tidak pernah jadi sumber angka uang.

const toast = useToast();

const { balance, loading: balanceLoading, refresh: refreshBalance } = useBalance();
const {
  destinations,
  channels,
  fetchDestinations,
  fetchChannels,
  create: createDestination,
  setDefault,
  deactivate,
} = usePayoutDestinations();
const {
  withdrawals,
  config: withdrawalConfig,
  fetchWithdrawals,
  fetchConfig,
  clearConfig,
  create: createWithdrawal,
  startPolling,
} = useWithdrawals();

function handleApiError(e: unknown, form?: { setErrors: (errors: { name: string; message: string }[]) => void }) {
  if (e instanceof ApiError) {
    if (form && e.errors?.length) {
      form.setErrors(e.errors.map((err) => ({ name: err.field, message: err.message })));
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

async function loadAll() {
  try {
    await Promise.all([
      refreshBalance(),
      fetchDestinations(),
      fetchChannels(),
      fetchWithdrawals(),
    ]);
    // Preselect rekening utama supaya user langsung bisa menarik dana.
    if (!withdrawState.destinationId) {
      const preferred =
        activeDestinations.value.find((d) => d.isDefault) ??
        activeDestinations.value[0];
      if (preferred) withdrawState.destinationId = preferred.id;
    }
  } catch (e) {
    handleApiError(e);
  }
}

onMounted(loadAll);

const channelById = computed(
  () => new Map(channels.value.map((c) => [c.id, c])),
);
const activeDestinations = computed(() =>
  destinations.value.filter((d) => d.isActive),
);
const destinationItems = computed(() =>
  activeDestinations.value.map((d) => ({
    label: `${d.accountName} · ${d.accountNumber}`,
    value: d.id,
  })),
);

// ---------------------------------------------------------------------------
// Tambah rekening tujuan
// ---------------------------------------------------------------------------
const destinationModalOpen = ref(false);
const destinationSubmitting = ref(false);

const destinationSchema = z.object({
  channelId: z.number({ error: "Pilih jenis rekening" }),
  accountNumber: z.string().min(1, "Nomor rekening wajib diisi"),
  accountName: z.string().min(1, "Nama pemilik rekening wajib diisi"),
});
type DestinationSchema = z.output<typeof destinationSchema>;

const destinationForm = ref();
const destinationState = reactive<Partial<DestinationSchema>>({});
const channelItems = computed(() =>
  channels.value.map((c) => ({ label: c.displayName, value: c.id })),
);

async function submitDestination(event: FormSubmitEvent<DestinationSchema>) {
  const channel = channelById.value.get(event.data.channelId);
  if (!channel) return;

  destinationSubmitting.value = true;
  try {
    await createDestination({
      channelId: event.data.channelId,
      accountNumber: event.data.accountNumber.trim(),
      accountName: event.data.accountName.trim(),
      bankCode: bankCodeFromChannelCode(channel.code),
    });
    toast.add({ title: "Rekening ditambahkan", color: "success" });
    destinationModalOpen.value = false;
    destinationState.channelId = undefined;
    destinationState.accountNumber = "";
    destinationState.accountName = "";
  } catch (e) {
    handleApiError(e, destinationForm.value);
  } finally {
    destinationSubmitting.value = false;
  }
}

// ---------------------------------------------------------------------------
// Aksi rekening (default & nonaktif)
// ---------------------------------------------------------------------------
async function makeDefault(destination: PayoutDestination) {
  try {
    await setDefault(destination.id);
    toast.add({ title: "Rekening utama diperbarui", color: "success" });
  } catch (e) {
    handleApiError(e);
  }
}

const deactivateTarget = ref<PayoutDestination | null>(null);
const deactivateSubmitting = ref(false);
const deactivateOpen = computed({
  get: () => !!deactivateTarget.value,
  set: (open) => {
    if (!open) deactivateTarget.value = null;
  },
});

async function confirmDeactivate() {
  if (!deactivateTarget.value) return;
  deactivateSubmitting.value = true;
  try {
    const target = deactivateTarget.value;
    await deactivate(target.id);
    toast.add({ title: "Rekening dinonaktifkan", color: "success" });
    // Kalau yang dinonaktifkan sedang dipilih untuk penarikan, kosongkan.
    if (withdrawState.destinationId === target.id) {
      withdrawState.destinationId = undefined;
    }
    deactivateTarget.value = null;
  } catch (e) {
    handleApiError(e);
  } finally {
    deactivateSubmitting.value = false;
  }
}

// ---------------------------------------------------------------------------
// Form penarikan
// ---------------------------------------------------------------------------
const withdrawForm = ref();

const withdrawState = reactive<{
  destinationId?: string;
  requestedAmount?: number;
}>({
  destinationId: undefined,
  requestedAmount: undefined,
});

const minAmount = computed(() => withdrawalConfig.value?.minAmount ?? 0);
const maxAmount = computed(() => withdrawalConfig.value?.maxAmount ?? 0);

// Batas dari backend (0 = tanpa batas) + jaga-jaga saldo tersedia.
const withdrawSchema = computed(() => {
  let amount = z.number({ error: "Nominal wajib diisi" });
  if (minAmount.value > 0) {
    amount = amount.min(minAmount.value, `Minimal ${formatIdr(minAmount.value)}`);
  }
  if (maxAmount.value > 0) {
    amount = amount.max(maxAmount.value, `Maksimal ${formatIdr(maxAmount.value)}`);
  }
  return z.object({
    destinationId: z.string().min(1, "Pilih rekening tujuan"),
    requestedAmount: amount.refine(
      (value) => value <= (balance.value?.available ?? 0),
      "Melebihi saldo tersedia",
    ),
  });
});
type WithdrawFormData = { destinationId: string; requestedAmount: number };

// Batas & biaya bergantung rekening (route channel) — muat ulang tiap ganti.
watch(
  () => withdrawState.destinationId,
  async (destinationId) => {
    withdrawState.requestedAmount = undefined;
    if (!destinationId) {
      clearConfig();
      return;
    }
    try {
      await fetchConfig(destinationId);
    } catch (e) {
      clearConfig();
      handleApiError(e);
    }
  },
);

const requestedAmount = computed(() => withdrawState.requestedAmount ?? 0);

// Samakan pembulatan dgn WithdrawalService: fixed + round(amount * bps / 10000).
function feeFor(amount: number) {
  const current = withdrawalConfig.value;
  if (!current || amount <= 0) return 0;
  return current.fixedFee + Math.round((amount * current.feePercentageBps) / 10000);
}

const feeEstimate = computed(() => feeFor(requestedAmount.value));
const netEstimate = computed(() =>
  Math.max(requestedAmount.value - feeEstimate.value, 0),
);

const confirmOpen = ref(false);
const submitting = ref(false);
const pendingKey = ref<string | null>(null);
const pendingPayload = ref<{
  destinationId: string;
  requestedAmount: number;
} | null>(null);

const pendingFee = computed(() =>
  feeFor(pendingPayload.value?.requestedAmount ?? 0),
);

function onWithdrawSubmit(event: FormSubmitEvent<WithdrawFormData>) {
  pendingPayload.value = {
    destinationId: event.data.destinationId,
    requestedAmount: event.data.requestedAmount,
  };
  // Key dibuat sekali di sini dan dipakai ulang kalau request perlu diulang,
  // supaya backend tidak membuat penarikan dobel.
  pendingKey.value = newIdempotencyKey();
  confirmOpen.value = true;
}

async function confirmWithdraw() {
  if (!pendingKey.value || !pendingPayload.value) return;

  submitting.value = true;
  try {
    const created = await createWithdrawal({
      idempotencyKey: pendingKey.value,
      destinationId: pendingPayload.value.destinationId,
      requestedAmount: pendingPayload.value.requestedAmount,
    });
    toast.add({
      title: "Penarikan diajukan",
      description: formatIdr(created.requestedAmount),
      color: "success",
    });
    confirmOpen.value = false;
    pendingKey.value = null;
    pendingPayload.value = null;
    withdrawState.requestedAmount = undefined;
    await refreshBalance();
    startPolling(created.id);
  } catch (e) {
    handleApiError(e, withdrawForm.value);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="payouts">
    <template #header>
      <UDashboardNavbar title="Pencairan">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            aria-label="Muat ulang"
            :loading="balanceLoading"
            @click="loadAll"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Saldo tersedia"
            :value="formatIdr(balance?.available ?? 0)"
            icon="i-lucide-wallet"
          />
          <StatCard
            label="Pending"
            :value="formatIdr(balance?.pending ?? 0)"
            icon="i-lucide-clock"
          />
          <StatCard
            label="Sedang ditarik"
            :value="formatIdr(balance?.withdrawalPayable ?? 0)"
            icon="i-lucide-lock"
          />
        </div>

        <!-- Rekening tujuan -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold text-highlighted">Rekening tujuan</h2>
                <p class="text-sm text-muted">
                  Rekening yang menerima dana penarikan.
                </p>
              </div>
              <UButton
                icon="i-lucide-plus"
                label="Tambah rekening"
                size="sm"
                @click="destinationModalOpen = true"
              />
            </div>
          </template>

          <UEmpty
            v-if="destinations.length === 0"
            icon="i-lucide-landmark"
            title="Belum ada rekening"
            description="Tambahkan rekening tujuan sebelum mengajukan penarikan."
          />

          <ul v-else class="divide-y divide-default">
            <li
              v-for="destination in destinations"
              :key="destination.id"
              class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="truncate font-medium text-highlighted">
                    {{ channelById.get(destination.channelId)?.displayName ?? "Rekening" }}
                  </p>
                  <UBadge
                    v-if="destination.isDefault"
                    color="primary"
                    variant="soft"
                    size="sm"
                  >
                    Utama
                  </UBadge>
                  <UBadge
                    v-if="!destination.isActive"
                    color="neutral"
                    variant="soft"
                    size="sm"
                  >
                    Nonaktif
                  </UBadge>
                </div>
                <p class="text-sm text-muted">
                  {{ destination.accountNumber }} · {{ destination.accountName }}
                </p>
              </div>

              <div class="flex items-center gap-1">
                <UButton
                  v-if="destination.isActive && !destination.isDefault"
                  label="Jadikan utama"
                  icon="i-lucide-star"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="makeDefault(destination)"
                />
                <UButton
                  v-if="destination.isActive"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  aria-label="Nonaktifkan rekening"
                  @click="deactivateTarget = destination"
                />
              </div>
            </li>
          </ul>
        </UCard>

        <!-- Form penarikan -->
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Tarik dana</h2>
          </template>

          <UAlert
            v-if="activeDestinations.length === 0"
            icon="i-lucide-info"
            color="info"
            variant="soft"
            title="Tambahkan rekening dulu"
            description="Kamu butuh minimal satu rekening aktif untuk menarik dana."
            class="mb-4"
          />

          <UForm
            ref="withdrawForm"
            :schema="withdrawSchema"
            :state="withdrawState"
            class="space-y-4"
            @submit="onWithdrawSubmit"
          >
            <UFormField name="destinationId" label="Rekening tujuan" required>
              <USelect
                v-model="withdrawState.destinationId"
                :items="destinationItems"
                placeholder="Pilih rekening"
                :disabled="activeDestinations.length === 0"
                class="w-full"
              />
            </UFormField>

            <UFormField
              name="requestedAmount"
              label="Nominal"
              :description="`Saldo tersedia ${formatIdr(balance?.available ?? 0)}`"
              required
            >
              <UInputNumber
                v-model="withdrawState.requestedAmount"
                :min="minAmount > 0 ? minAmount : undefined"
                :max="maxAmount > 0 ? maxAmount : undefined"
                :step="1000"
                :disabled="!withdrawalConfig"
                :format-options="{
                  style: 'currency',
                  currency: 'IDR',
                  maximumFractionDigits: 0,
                }"
                locale="id-ID"
                placeholder="0"
                class="w-full"
              />
            </UFormField>

            <dl class="space-y-1 rounded-lg bg-elevated p-3 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">Biaya penarikan</dt>
                <dd class="tabular-nums">{{ formatIdr(feeEstimate) }}</dd>
              </div>
              <div class="flex justify-between font-medium text-highlighted">
                <dt>Diterima</dt>
                <dd class="tabular-nums">{{ formatIdr(netEstimate) }}</dd>
              </div>
            </dl>

            <UButton
              type="submit"
              label="Ajukan penarikan"
              icon="i-lucide-banknote"
              :disabled="activeDestinations.length === 0"
              block
            />
          </UForm>
        </UCard>

        <!-- Riwayat penarikan -->
        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <h2 class="font-semibold text-highlighted">Riwayat penarikan</h2>
          </template>

          <UEmpty
            v-if="withdrawals.length === 0"
            icon="i-lucide-receipt"
            title="Belum ada penarikan"
            description="Penarikan yang kamu ajukan akan tampil di sini."
          />

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted">
                  <th class="px-4 py-3 font-medium sm:px-6">ID</th>
                  <th class="hidden px-4 py-3 font-medium md:table-cell md:px-6">
                    Tanggal
                  </th>
                  <th class="px-4 py-3 font-medium sm:px-6">Rekening</th>
                  <th class="px-4 py-3 text-right font-medium sm:px-6">Nominal</th>
                  <th class="hidden px-4 py-3 text-right font-medium sm:table-cell sm:px-6">
                    Diterima
                  </th>
                  <th class="px-4 py-3 text-right font-medium sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="withdrawal in withdrawals" :key="withdrawal.id">
                  <td class="px-4 py-3 font-medium whitespace-nowrap text-highlighted sm:px-6">
                    {{ withdrawal.id.slice(0, 8) }}
                  </td>
                  <td class="hidden px-4 py-3 whitespace-nowrap text-muted md:table-cell md:px-6">
                    {{ formatDateTime(withdrawal.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-default sm:px-6">
                    <p class="truncate">{{ withdrawal.destinationAccountName }}</p>
                    <p class="text-xs text-muted">
                      {{ withdrawal.destinationAccountNumber }}
                    </p>
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums sm:px-6">
                    {{ formatIdr(withdrawal.requestedAmount) }}
                  </td>
                  <td class="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums sm:table-cell sm:px-6">
                    {{ formatIdr(withdrawal.netDisbursementAmount) }}
                  </td>
                  <td class="px-4 py-3 text-right sm:px-6">
                    <UBadge
                      :color="withdrawalStatusMeta[withdrawal.status].color"
                      variant="soft"
                      size="sm"
                    >
                      {{ withdrawalStatusMeta[withdrawal.status].label }}
                    </UBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modal tambah rekening -->
  <UModal
    v-model:open="destinationModalOpen"
    title="Tambah rekening tujuan"
    description="Dana penarikan akan dikirim ke rekening ini."
  >
    <template #body>
      <UForm
        id="destination-form"
        ref="destinationForm"
        :schema="destinationSchema"
        :state="destinationState"
        class="space-y-4"
        @submit="submitDestination"
      >
        <UFormField name="channelId" label="Jenis rekening" required>
          <USelect
            v-model="destinationState.channelId"
            :items="channelItems"
            placeholder="Pilih bank / e-wallet"
            class="w-full"
          />
        </UFormField>
        <UFormField name="accountNumber" label="Nomor rekening" required>
          <UInput
            v-model="destinationState.accountNumber"
            placeholder="Contoh: 1234567890"
            class="w-full"
          />
        </UFormField>
        <UFormField name="accountName" label="Nama pemilik" required>
          <UInput
            v-model="destinationState.accountName"
            placeholder="Nama sesuai rekening"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close }">
      <UButton
        label="Batal"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        type="submit"
        form="destination-form"
        label="Simpan"
        :loading="destinationSubmitting"
      />
    </template>
  </UModal>

  <!-- Modal konfirmasi penarikan -->
  <UModal
    v-model:open="confirmOpen"
    title="Konfirmasi penarikan"
    description="Periksa kembali detail penarikan kamu."
  >
    <template #body>
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between">
          <dt class="text-muted">Nominal</dt>
          <dd class="tabular-nums">{{ formatIdr(pendingPayload?.requestedAmount ?? 0) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-muted">Biaya</dt>
          <dd class="tabular-nums">{{ formatIdr(pendingFee) }}</dd>
        </div>
        <div class="flex justify-between font-medium text-highlighted">
          <dt>Diterima</dt>
          <dd class="tabular-nums">
            {{ formatIdr(Math.max((pendingPayload?.requestedAmount ?? 0) - pendingFee, 0)) }}
          </dd>
        </div>
      </dl>
    </template>
    <template #footer="{ close }">
      <UButton
        label="Batal"
        color="neutral"
        variant="outline"
        @click="close"
      />
      <UButton
        label="Konfirmasi"
        color="primary"
        :loading="submitting"
        @click="confirmWithdraw"
      />
    </template>
  </UModal>

  <!-- Modal konfirmasi nonaktif rekening -->
    <UModal
      v-model:open="deactivateOpen"
      title="Nonaktifkan rekening?"
    :description="
      deactivateTarget
        ? `Rekening ${deactivateTarget.accountNumber} tidak akan bisa dipakai menarik dana.`
        : ''
    "
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <UButton
        label="Batal"
        color="neutral"
        variant="outline"
        @click="deactivateTarget = null"
      />
      <UButton
        label="Nonaktifkan"
        color="error"
        :loading="deactivateSubmitting"
        @click="confirmDeactivate"
      />
    </template>
  </UModal>
</template>
