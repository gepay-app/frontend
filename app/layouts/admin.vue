<script setup lang="ts">
const sections = internalSections;
</script>

<template>
  <AppDashboardShell :sections="sections" home-to="/internal">
    <slot />
  </AppDashboardShell>
</template>
