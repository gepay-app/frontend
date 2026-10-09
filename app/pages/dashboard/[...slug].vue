<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const route = useRoute();

const entry = computed(() => findDashboardNav(route.path));

const title = computed(() => {
  if (entry.value) return entry.value.label;
  const last = route.path.split("/").filter(Boolean).pop() ?? "Halaman";
  return last.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
});

const icon = computed(() => entry.value?.icon ?? "i-lucide-construction");
</script>

<template>
  <UDashboardPanel :id="`placeholder-${route.path}`">
    <template #header>
      <UDashboardNavbar :title="title" :icon="icon">
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
          :icon="icon"
          title="Halaman contoh"
          description="Menu ini masih dummy untuk menguji layout dashboard. Isinya akan dibuat setelah modul backend terkait selesai."
        />
      </UCard>
    </template>
  </UDashboardPanel>
</template>
