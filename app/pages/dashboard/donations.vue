<script setup lang="ts">
import type { DonationStatus } from "~/types/donation";

definePageMeta({
  layout: "dashboard",
  middleware: "creator",
});

const toast = useToast();

const { donations, loading, loadingMore, hasNext, fetchMine, loadMore } =
  useDonations();

// Filter status dilakukan di client karena endpoint /donations/me belum punya
// filter status (cursor keyset by id).
const statusFilter = ref<DonationStatus | "ALL">("ALL");
const statusItems = [
  { label: "Semua status", value: "ALL" },
  { label: "Menunggu", value: "PENDING" },
  { label: "Berhasil", value: "PAID" },
  { label: "Kedaluwarsa", value: "EXPIRED" },
  { label: "Gagal", value: "FAILED" },
];

const filtered = computed(() =>
  statusFilter.value === "ALL"
    ? donations.value
    : donations.value.filter((d) => d.status === statusFilter.value),
);

function donorLabel(donation: {
  isAnonymous: boolean;
  donorName: string | null;
}) {
  if (donation.isAnonymous || !donation.donorName) return "Anonim";
  return donation.donorName;
}

async function load() {
  try {
    await fetchMine();
  } catch (e) {
    toast.add({
      title: "Gagal memuat donasi",
      description: e instanceof Error ? e.message : "Coba lagi.",
      color: "error",
    });
  }
}

onMounted(load);
</script>

<template>
  <UDashboardPanel id="donations">
    <template #header>
      <UDashboardNavbar title="Donasi masuk">
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
            @click="load"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <USelect
            v-model="statusFilter"
            :items="statusItems"
            icon="i-lucide-filter"
            class="w-44"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <UEmpty
          v-if="!loading && filtered.length === 0"
          icon="i-lucide-hand-coins"
          title="Belum ada donasi"
          description="Donasi yang masuk akan tampil di sini beserta pesan donatur."
        />

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted">
                <th class="px-4 py-3 font-medium sm:px-6">Donatur</th>
                <th class="px-4 py-3 font-medium sm:px-6">Pesan</th>
                <th class="hidden px-4 py-3 font-medium md:table-cell md:px-6">
                  Tipe
                </th>
                <th class="px-4 py-3 text-right font-medium sm:px-6">Nominal</th>
                <th class="hidden px-4 py-3 text-right lg:table-cell lg:px-6">
                  Total tagihan
                </th>
                <th class="hidden px-4 py-3 font-medium md:table-cell md:px-6">
                  Waktu
                </th>
                <th class="px-4 py-3 text-right font-medium sm:px-6">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="donation in filtered" :key="donation.donationId">
                <td class="px-4 py-3 align-top sm:px-6">
                  <p class="font-medium whitespace-nowrap text-highlighted">
                    {{ donorLabel(donation) }}
                  </p>
                  <p
                    v-if="!donation.isAnonymous && donation.donorEmail"
                    class="text-xs text-muted"
                  >
                    {{ donation.donorEmail }}
                  </p>
                </td>
                <td class="max-w-xs px-4 py-3 align-top text-default sm:px-6">
                  <UTooltip v-if="donation.message" :text="donation.message">
                    <span class="line-clamp-2 whitespace-pre-line text-left">
                      {{ donation.message }}
                    </span>
                  </UTooltip>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="hidden px-4 py-3 align-top text-default md:table-cell md:px-6">
                  {{ donation.type }}
                </td>
                <td class="px-4 py-3 text-right align-top whitespace-nowrap tabular-nums sm:px-6">
                  {{ formatIdr(donation.amount) }}
                </td>
                <td class="hidden px-4 py-3 text-right align-top whitespace-nowrap tabular-nums lg:table-cell lg:px-6">
                  {{ donation.totalChargedAmount != null ? formatIdr(donation.totalChargedAmount) : "—" }}
                </td>
                <td class="hidden px-4 py-3 align-top whitespace-nowrap text-muted md:table-cell md:px-6">
                  {{ formatDateTime(donation.createdAt) }}
                </td>
                <td class="px-4 py-3 text-right align-top sm:px-6">
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

        <template v-if="hasNext" #footer>
          <div class="flex justify-center">
            <UButton
              label="Muat lebih banyak"
              color="neutral"
              variant="outline"
              :loading="loadingMore"
              @click="loadMore"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
