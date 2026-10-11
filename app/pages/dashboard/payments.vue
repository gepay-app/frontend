<script setup lang="ts">
import type { PaymentStatus } from "~/types/payment";

definePageMeta({ layout: "dashboard" });

const toast = useToast();
const { payments, loading, fetchPayments } = usePayments();

const search = ref("");
const statusFilter = ref<PaymentStatus | "ALL">("ALL");

const statusItems = computed(() => [
  { label: "Semua status", value: "ALL" },
  ...[...new Set(payments.value.map((p) => p.status))].map((status) => ({
    label: paymentStatusMeta[status].label,
    value: status,
  })),
]);

const filtered = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return payments.value.filter((payment) => {
    const matchStatus =
      statusFilter.value === "ALL" || payment.status === statusFilter.value;
    const matchKeyword =
      !keyword ||
      payment.id.toLowerCase().includes(keyword) ||
      payment.type.toLowerCase().includes(keyword) ||
      payment.status.toLowerCase().includes(keyword);
    return matchStatus && matchKeyword;
  });
});

onMounted(async () => {
  try {
    await fetchPayments();
  } catch (e) {
    toast.add({
      title: "Gagal memuat pembayaran",
      description: e instanceof Error ? e.message : "Coba lagi.",
      color: "error",
    });
  }
});
</script>

<template>
  <UDashboardPanel id="payments">
    <template #header>
      <UDashboardNavbar title="Pembayaran">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            aria-label="Muat ulang"
            :loading="loading"
            @click="fetchPayments"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari ID, tipe, atau status..."
            class="w-full sm:w-64"
          />
        </template>
        <template #right>
          <USelect
            v-model="statusFilter"
            :items="statusItems"
            class="w-44"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <UEmpty
          v-if="!loading && filtered.length === 0"
          icon="i-lucide-receipt"
          title="Belum ada pembayaran"
          description="Pembayaran masuk (donasi/pembelian) akan tampil di sini."
        />

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted">
                <th class="px-4 py-3 font-medium sm:px-6">ID</th>
                <th class="px-4 py-3 font-medium sm:px-6">Tipe</th>
                <th class="hidden px-4 py-3 font-medium md:table-cell md:px-6">
                  Tanggal
                </th>
                <th class="px-4 py-3 text-right font-medium sm:px-6">Bruto</th>
                <th class="hidden px-4 py-3 text-right font-medium sm:table-cell sm:px-6">
                  Diterima
                </th>
                <th class="px-4 py-3 text-right font-medium sm:px-6">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="payment in filtered" :key="payment.id">
                <td class="px-4 py-3 font-medium whitespace-nowrap text-highlighted sm:px-6">
                  {{ payment.id.slice(0, 8) }}
                </td>
                <td class="px-4 py-3 text-default sm:px-6">{{ payment.type }}</td>
                <td class="hidden px-4 py-3 whitespace-nowrap text-muted md:table-cell md:px-6">
                  {{ formatDateTime(payment.createdAt) }}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums sm:px-6">
                  {{ formatIdr(payment.grossAmount) }}
                </td>
                <td class="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums sm:table-cell sm:px-6">
                  {{ formatIdr(payment.netCreatorAmount) }}
                </td>
                <td class="px-4 py-3 text-right sm:px-6">
                  <UBadge
                    :color="paymentStatusMeta[payment.status].color"
                    variant="soft"
                    size="sm"
                  >
                    {{ paymentStatusMeta[payment.status].label }}
                  </UBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
