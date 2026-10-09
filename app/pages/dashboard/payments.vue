<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

interface Payment {
  id: string;
  customer: string;
  method: string;
  date: string;
  amount: string;
  status: "Berhasil" | "Menunggu" | "Gagal";
}

const payments: Payment[] = [
  { id: "TRX-1042", customer: "Toko Sinar Jaya", method: "Transfer bank", date: "10 Okt 2026", amount: "Rp 1.250.000", status: "Berhasil" },
  { id: "TRX-1041", customer: "Kopi Kita", method: "QRIS", date: "10 Okt 2026", amount: "Rp 84.000", status: "Berhasil" },
  { id: "TRX-1040", customer: "PT Maju Bersama", method: "Virtual account", date: "09 Okt 2026", amount: "Rp 12.400.000", status: "Menunggu" },
  { id: "TRX-1039", customer: "Budi Santoso", method: "Kartu kredit", date: "09 Okt 2026", amount: "Rp 320.000", status: "Gagal" },
  { id: "TRX-1038", customer: "Warung Bu Tini", method: "QRIS", date: "08 Okt 2026", amount: "Rp 45.000", status: "Berhasil" },
  { id: "TRX-1037", customer: "PT Maju Bersama", method: "Virtual account", date: "08 Okt 2026", amount: "Rp 7.800.000", status: "Berhasil" },
];

const statusColor: Record<Payment["status"], "success" | "warning" | "error"> = {
  Berhasil: "success",
  Menunggu: "warning",
  Gagal: "error",
};

const search = ref("");
const statusFilter = ref("Semua");
const statuses = ["Semua", "Berhasil", "Menunggu", "Gagal"];

const filtered = computed(() =>
  payments.filter((payment) => {
    const matchStatus =
      statusFilter.value === "Semua" || payment.status === statusFilter.value;
    const keyword = search.value.trim().toLowerCase();
    const matchKeyword =
      !keyword ||
      payment.id.toLowerCase().includes(keyword) ||
      payment.customer.toLowerCase().includes(keyword);
    return matchStatus && matchKeyword;
  }),
);
</script>

<template>
  <UDashboardPanel id="payments">
    <template #header>
      <UDashboardNavbar title="Pembayaran">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Cari ID atau pelanggan..."
            class="w-full sm:w-64"
          />
        </template>
        <template #right>
          <USelect v-model="statusFilter" :items="statuses" class="w-36" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <UEmpty
          v-if="filtered.length === 0"
          icon="i-lucide-receipt"
          title="Belum ada pembayaran"
          description="Pembayaran yang cocok dengan filter akan tampil di sini."
        />

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted">
                <th class="px-4 py-3 font-medium sm:px-6">ID</th>
                <th class="px-4 py-3 font-medium sm:px-6">Pelanggan</th>
                <th class="hidden px-4 py-3 font-medium sm:table-cell sm:px-6">Metode</th>
                <th class="hidden px-4 py-3 font-medium md:table-cell md:px-6">Tanggal</th>
                <th class="px-4 py-3 text-right font-medium sm:px-6">Jumlah</th>
                <th class="px-4 py-3 text-right font-medium sm:px-6">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="payment in filtered" :key="payment.id">
                <td class="px-4 py-3 font-medium whitespace-nowrap text-highlighted sm:px-6">
                  {{ payment.id }}
                </td>
                <td class="px-4 py-3 text-default sm:px-6">{{ payment.customer }}</td>
                <td class="hidden px-4 py-3 text-muted sm:table-cell sm:px-6">
                  {{ payment.method }}
                </td>
                <td class="hidden px-4 py-3 whitespace-nowrap text-muted md:table-cell md:px-6">
                  {{ payment.date }}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums sm:px-6">
                  {{ payment.amount }}
                </td>
                <td class="px-4 py-3 text-right sm:px-6">
                  <UBadge :color="statusColor[payment.status]" variant="soft" size="sm">
                    {{ payment.status }}
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
