<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const toast = useToast();

const { hasRole } = useCurrentUser();
const isCreator = computed(() => hasRole("CREATOR"));

const { balance, refresh: refreshBalance } = useBalance();
const { payments, fetchPayments } = usePayments();
const { donations, fetchMine: fetchDonations } = useDonations();

// Saldo dari backend: `pending` = sudah dibayar tapi belum settle;
// `withdrawalPayable` = ditahan karena penarikan sedang berjalan (hold J-5).
const balanceCards = computed(() => [
  {
    label: "Saldo tersedia",
    value: formatIdr(balance.value?.available ?? 0),
    icon: "i-lucide-wallet",
  },
  {
    label: "Pending",
    value: formatIdr(balance.value?.pending ?? 0),
    icon: "i-lucide-clock",
  },
  {
    label: "Ditahan untuk penarikan",
    value: formatIdr(balance.value?.withdrawalPayable ?? 0),
    icon: "i-lucide-lock",
  },
]);

const recentPayments = computed(() => payments.value.slice(0, 5));
const recentDonations = computed(() => donations.value.slice(0, 5));

function donorLabel(
  donation: { isAnonymous: boolean; donorName: string | null },
) {
  if (donation.isAnonymous || !donation.donorName) return "Anonim";
  return donation.donorName;
}

async function loadAll() {
  try {
    await Promise.all([
      refreshBalance(),
      fetchPayments(),
      ...(isCreator.value ? [fetchDonations()] : []),
    ]);
  } catch (e) {
    toast.add({
      title: "Gagal memuat ringkasan",
      description: e instanceof Error ? e.message : "Coba lagi.",
      color: "error",
    });
  }
}

onMounted(loadAll);
</script>

<template>
  <UDashboardPanel id="overview">
    <template #header>
      <UDashboardNavbar title="Ringkasan">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard v-for="card in balanceCards" :key="card.label" v-bind="card" />
        </div>

        <!-- Donasi terbaru (khusus creator) -->
        <UCard v-if="isCreator" :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">Donasi terbaru</h2>
              <UButton
                to="/dashboard/donations"
                label="Lihat semua"
                color="neutral"
                variant="link"
                size="sm"
                trailing-icon="i-lucide-arrow-right"
              />
            </div>
          </template>

          <UEmpty
            v-if="recentDonations.length === 0"
            icon="i-lucide-hand-coins"
            title="Belum ada donasi"
            description="Donasi masuk akan tampil di sini."
          />

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted">
                  <th class="px-4 py-3 font-medium sm:px-6">Donatur</th>
                  <th class="px-4 py-3 font-medium sm:px-6">Tipe</th>
                  <th class="hidden px-4 py-3 font-medium md:table-cell md:px-6">
                    Waktu
                  </th>
                  <th class="px-4 py-3 text-right font-medium sm:px-6">Nominal</th>
                  <th class="px-4 py-3 text-right font-medium sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="donation in recentDonations" :key="donation.donationId">
                  <td class="px-4 py-3 font-medium whitespace-nowrap text-highlighted sm:px-6">
                    {{ donorLabel(donation) }}
                  </td>
                  <td class="px-4 py-3 text-default sm:px-6">
                    {{ donation.type }}
                  </td>
                  <td class="hidden px-4 py-3 whitespace-nowrap text-muted md:table-cell md:px-6">
                    {{ formatDateTime(donation.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums sm:px-6">
                    {{ formatIdr(donation.amount) }}
                  </td>
                  <td class="px-4 py-3 text-right sm:px-6">
                    <UBadge
                      :color="donationStatusMeta[donation.status].color"
                      variant="soft"
                      size="sm"
                    >
                      {{ donationStatusMeta[donation.status].label }}
                    </UBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">Pembayaran terbaru</h2>
              <UButton
                to="/dashboard/payments"
                label="Lihat semua"
                color="neutral"
                variant="link"
                size="sm"
                trailing-icon="i-lucide-arrow-right"
              />
            </div>
          </template>

          <UEmpty
            v-if="recentPayments.length === 0"
            icon="i-lucide-receipt"
            title="Belum ada pembayaran"
            description="Pembayaran masuk akan tampil di sini."
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
                  <th class="px-4 py-3 text-right font-medium sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="payment in recentPayments" :key="payment.id">
                  <td class="px-4 py-3 font-medium whitespace-nowrap text-highlighted sm:px-6">
                    {{ payment.id.slice(0, 8) }}
                  </td>
                  <td class="px-4 py-3 text-default sm:px-6">
                    {{ payment.type }}
                  </td>
                  <td class="hidden px-4 py-3 whitespace-nowrap text-muted md:table-cell md:px-6">
                    {{ formatDateTime(payment.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums sm:px-6">
                    {{ formatIdr(payment.grossAmount) }}
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
      </div>
    </template>
  </UDashboardPanel>
</template>
