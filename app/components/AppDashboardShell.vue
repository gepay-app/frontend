<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { DashboardNavSection } from "~/utils/dashboard-nav";

// Shell sidebar untuk dashboard user & admin. Area user/admin cuma beda
// `sections` (menu), `homeTo` (link logo), dan `settingsTo`.
const props = withDefaults(
  defineProps<{
    sections: DashboardNavSection[];
    homeTo: string;
    settingsTo?: string;
  }>(),
  {
    settingsTo: "/dashboard/settings",
  },
);

const { principal, hasRole } = useCurrentUser();
const { logout } = useAuth();
const route = useRoute();

// Dilacak supaya padding body bisa dikecilkan saat sidebar tertutup — kalau
// tidak, lebar 64px dikurangi px-4 nyisain pas 20px buat ikon (kepotong).
const sidebarCollapsed = ref(false);

// Section yang punya `roles` disaring sesuai role user — UI-only guard,
// enforcement aslinya tetap di backend.
const navigation = computed(() =>
  buildDashboardNavItems(
    props.sections.filter(
      (section) => !section.roles || section.roles.some((role) => hasRole(role)),
    ),
    route.path,
  ),
);

const userMenu = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: "Profil & pengaturan",
      icon: "i-lucide-user",
      to: props.settingsTo,
    },
  ],
  [
    {
      label: "Keluar",
      icon: "i-lucide-log-out",
      onSelect: () => logout(),
    },
  ],
]);

const displayName = computed(
  () => principal.value?.name || principal.value?.email || "Pengguna",
);
const initials = computed(() => displayName.value.charAt(0).toUpperCase());
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      v-model:collapsed="sidebarCollapsed"
      collapsible
      resizable
      :ui="{
        footer: 'border-t border-default',
        body: sidebarCollapsed
          ? 'scrollbar-hover px-2 [scrollbar-gutter:stable_both-edges]'
          : 'scrollbar-hover',
      }"
    >
      <template #header="{ collapsed }">
        <AppLogo :to="homeTo" :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="navigation"
          :collapsed="collapsed"
          :tooltip="collapsed"
          :popover="collapsed"
          orientation="vertical"
          :ui="{ link: collapsed ? 'justify-center px-0' : undefined }"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenu"
          :content="{ align: 'start' }"
          class="w-full"
        >
          <UButton
            color="neutral"
            variant="ghost"
            class="w-full"
            :class="collapsed ? 'justify-center px-0' : 'justify-start'"
          >
            <UAvatar :text="initials" size="2xs" />
            <span v-if="!collapsed" class="truncate text-sm">{{ displayName }}</span>
            <UIcon
              v-if="!collapsed"
              name="i-lucide-chevrons-up-down"
              class="ms-auto size-4 text-dimmed"
            />
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
