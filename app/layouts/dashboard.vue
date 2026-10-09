<script setup lang="ts">
const sections = dashboardSections;
</script>

<template>
  <AppDashboardShell :sections="sections" home-to="/dashboard">
    <slot />
  </AppDashboardShell>
</template>
