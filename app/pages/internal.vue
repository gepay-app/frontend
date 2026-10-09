<script setup lang="ts">
// Parent route untuk /internal/**. Meta di sini otomatis diwarisi semua anak,
// jadi gate admin + layout cukup ditulis SEKALI di sini.
// Lihat app/middleware/admin.ts untuk logika gate-nya.
definePageMeta({
  layout: "admin",
  middleware: "admin",
});
</script>

<template>
  <NuxtPage />
</template>
