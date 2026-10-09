<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

const { principal } = useCurrentUser();

const displayName = computed(
  () => principal.value?.name || principal.value?.email || "Pengguna",
);
const initials = computed(() => displayName.value.charAt(0).toUpperCase());
const statusColor = computed(() =>
  principal.value?.status === "DISABLED" ? "error" : "success",
);
</script>

<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Pengaturan">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-2xl space-y-6">
        <UCard>
          <div class="flex items-center gap-4">
            <UAvatar :text="initials" size="xl" />
            <div class="min-w-0">
              <p class="font-semibold text-highlighted">{{ displayName }}</p>
              <p class="truncate text-sm text-muted">{{ principal?.email }}</p>
            </div>
          </div>

          <dl class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-sm text-muted">Status akun</dt>
              <dd class="mt-1">
                <UBadge :color="statusColor" variant="soft" size="sm">
                  {{ principal?.status === "DISABLED" ? "Nonaktif" : "Aktif" }}
                </UBadge>
              </dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Peran</dt>
              <dd class="mt-1 flex flex-wrap gap-1">
                <UBadge
                  v-for="role in principal?.roles ?? []"
                  :key="role"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ role }}
                </UBadge>
                <span v-if="!principal?.roles?.length" class="text-sm text-dimmed">
                  -
                </span>
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Keamanan</h2>
          </template>
          <p class="text-sm text-muted">
            Kata sandi dan verifikasi email dikelola oleh Firebase. Gunakan
            tautan di bawah untuk mengirim email atur ulang kata sandi.
          </p>
          <UButton
            class="mt-4"
            to="/login"
            label="Atur ulang kata sandi"
            color="neutral"
            variant="outline"
            icon="i-lucide-key-round"
          />
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
