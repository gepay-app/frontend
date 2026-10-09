<script setup lang="ts">
definePageMeta({ layout: "dashboard" });
</script>

<template>
  <UDashboardPanel id="ledger">
    <template #header>
      <UDashboardNavbar title="Buku besar">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" label="Jurnal baru" size="sm" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          icon="i-lucide-info"
          color="info"
          variant="soft"
          title="Modul buku besar belum aktif"
          description="Halaman ini akan menampilkan jurnal, akun, dan laporan setelah modul ledger di backend selesai."
        />

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <UEmpty
            icon="i-lucide-book-open"
            title="Belum ada jurnal"
            description="Entri jurnal dari transaksi akan muncul di sini secara otomatis."
          />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
