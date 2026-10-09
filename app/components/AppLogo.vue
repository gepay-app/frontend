<script setup lang="ts">
withDefaults(
  defineProps<{
    to?: string;
    collapsed?: boolean;
  }>(),
  {
    to: "/",
    collapsed: false,
  },
);
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-2 text-highlighted"
    :class="collapsed && 'justify-center'"
  >
    <span
      class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-inverted"
    >
      <UIcon name="i-lucide-wallet" class="size-5" />
    </span>
    <span
      v-if="!collapsed"
      class="text-base font-semibold tracking-tight whitespace-nowrap"
    >
      GePay
    </span>
  </NuxtLink>
</template>
