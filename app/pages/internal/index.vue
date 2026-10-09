<template>
  <UDashboardPanel id="internal-overview">
    <template #header>
      <UDashboardNavbar title="Ringkasan admin" icon="i-lucide-shield-check">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <UEmpty
          icon="i-lucide-shield-check"
          title="Area admin"
          description="Semua halaman di /internal/** cuma bisa diakses role ADMIN / SUPER_ADMIN."
        />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
