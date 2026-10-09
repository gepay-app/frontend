<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

interface Stat {
  label: string;
  value: string;
  icon: string;
  change?: string;
  trend?: "up" | "down";
}

interface Transaction {
  id: string;
  customer: string;
  method: string;
  amount: string;
  status: string;
  color: "success" | "warning" | "error" | "neutral";
}

const stats: Stat[] = [
  {
    label: "Total saldo",
    value: "Rp 48.250.000",
    icon: "i-lucide-wallet",
    change: "+2,4% dari bulan lalu",
    trend: "up",
  },
  {
    label: "Pembayaran sukses",
    value: "1.284",
    icon: "i-lucide-circle-check",
    change: "+12% dari bulan lalu",
    trend: "up",
  },
  {
    label: "Menunggu tindakan",
    value: "37",
    icon: "i-lucide-clock",
    change: "Perlu ditindaklanjuti",
    trend: "down",
  },
  {
    label: "Selisih buku besar",
    value: "Rp 0",
    icon: "i-lucide-scale",
    change: "Semua transaksi seimbang",
    trend: "up",
  },
];

const transactions: Transaction[] = [
  {
    id: "TRX-1042",
    customer: "Toko Sinar Jaya",
    method: "Transfer bank",
    amount: "Rp 1.250.000",
    status: "Berhasil",
    color: "success",
  },
  {
    id: "TRX-1041",
    customer: "Kopi Kita",
    method: "QRIS",
    amount: "Rp 84.000",
    status: "Berhasil",
    color: "success",
  },
  {
    id: "TRX-1040",
    customer: "PT Maju Bersama",
    method: "Virtual account",
    amount: "Rp 12.400.000",
    status: "Menunggu",
    color: "warning",
  },
  {
    id: "TRX-1039",
    customer: "Budi Santoso",
    method: "Kartu kredit",
    amount: "Rp 320.000",
    status: "Gagal",
    color: "error",
  },
  {
    id: "TRX-1038",
    customer: "Warung Bu Tini",
    method: "QRIS",
    amount: "Rp 45.000",
    status: "Berhasil",
    color: "success",
  },
];
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
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
        </div>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">Transaksi terbaru</h2>
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

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted">
                  <th class="px-4 py-3 font-medium sm:px-6">ID</th>
                  <th class="px-4 py-3 font-medium sm:px-6">Pelanggan</th>
                  <th class="hidden px-4 py-3 font-medium sm:table-cell sm:px-6">
                    Metode
                  </th>
                  <th class="px-4 py-3 text-right font-medium sm:px-6">Jumlah</th>
                  <th class="px-4 py-3 text-right font-medium sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="trx in transactions" :key="trx.id">
                  <td class="px-4 py-3 font-medium whitespace-nowrap text-highlighted sm:px-6">
                    {{ trx.id }}
                  </td>
                  <td class="px-4 py-3 text-default sm:px-6">{{ trx.customer }}</td>
                  <td class="hidden px-4 py-3 text-muted sm:table-cell sm:px-6">
                    {{ trx.method }}
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap tabular-nums sm:px-6">
                    {{ trx.amount }}
                  </td>
                  <td class="px-4 py-3 text-right sm:px-6">
                    <UBadge :color="trx.color" variant="soft" size="sm">
                      {{ trx.status }}
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
