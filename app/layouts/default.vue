<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { principal } = useCurrentUser();

const links: NavigationMenuItem[] = [
  { label: "Fitur", to: "/#fitur" },
  { label: "Cara kerja", to: "/#cara-kerja" },
];

const year = new Date().getFullYear();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <UHeader>
      <template #title>
        <AppLogo />
      </template>

      <UNavigationMenu :items="links" />

      <template #right>
        <UColorModeButton />
        <UButton
          v-if="principal"
          to="/dashboard"
          label="Buka dashboard"
          size="sm"
        />
        <template v-else>
          <UButton
            to="/login"
            label="Masuk"
            color="neutral"
            variant="ghost"
            size="sm"
          />
          <UButton to="/register" label="Daftar" size="sm" />
        </template>
      </template>

      <template #body>
        <UNavigationMenu
          :items="links"
          orientation="vertical"
          class="-mx-2.5"
        />
      </template>
    </UHeader>

    <UMain class="flex-1">
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">© {{ year }} GePay. Semua hak dilindungi.</p>
      </template>
      <template #right>
        <UButton
          to="/login"
          label="Masuk"
          color="neutral"
          variant="link"
          size="sm"
        />
        <UButton
          to="/register"
          label="Daftar"
          color="neutral"
          variant="link"
          size="sm"
        />
      </template>
    </UFooter>
  </div>
</template>
