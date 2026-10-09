<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  icon: string;
  change?: string;
  trend?: "up" | "down";
}>();
</script>

<template>
  <UCard>
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm text-muted">{{ label }}</p>
        <p class="mt-1 text-2xl font-semibold tracking-tight text-highlighted">
          {{ value }}
        </p>
      </div>
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted"
      >
        <UIcon :name="icon" class="size-5" />
      </span>
    </div>
    <p
      v-if="change"
      class="mt-2 text-xs"
      :class="trend === 'down' ? 'text-error' : 'text-success'"
    >
      {{ change }}
    </p>
  </UCard>
</template>
