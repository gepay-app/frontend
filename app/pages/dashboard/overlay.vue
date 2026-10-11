<script setup lang="ts">
import type { OverlayQueueItem } from "~/types/donation";

definePageMeta({
  layout: "dashboard",
  middleware: "creator",
});

const toast = useToast();

const {
  connected,
  reconnecting,
  paused,
  displayOnline,
  overlayKey,
  currentId,
  queue,
  connect,
  pause,
  resume,
  skip,
  purge,
  retry,
  retryAll,
  fetchQueue,
} = useOverlayController();

const origin = ref("");
const busy = ref(false);

const activeItems = computed(() =>
  queue.value.filter(
    (item) => item.status === "PENDING" || item.status === "PLAYING",
  ),
);
const playedItems = computed(() =>
  queue.value.filter((item) => item.status === "PLAYED"),
);
const failedItems = computed(() =>
  queue.value.filter(
    (item) => item.status === "FAILED" || item.status === "SKIPPED",
  ),
);

const displayUrl = computed(() =>
  overlayKey.value && origin.value
    ? `${origin.value}/overlay/${overlayKey.value}`
    : "",
);

function donorLabel(item: OverlayQueueItem) {
  return item.donorName || "Anonim";
}

async function run(action: () => Promise<unknown>, successMessage: string) {
  busy.value = true;
  try {
    await action();
    if (!connected.value) await fetchQueue();
    toast.add({ title: successMessage, color: "success" });
  } catch (e) {
    toast.add({
      title: "Gagal",
      description: e instanceof Error ? e.message : "Coba lagi.",
      color: "error",
    });
  } finally {
    busy.value = false;
  }
}

const skipOpen = ref(false);
const purgeOpen = ref(false);

function confirmSkip() {
  skipOpen.value = false;
  void run(skip, "Item dilewati");
}
function confirmPurge() {
  purgeOpen.value = false;
  void run(purge, "Antrean menunggu dibersihkan");
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: `${label} disalin`, color: "success" });
  } catch {
    toast.add({ title: "Gagal menyalin", color: "error" });
  }
}

async function load() {
  try {
    await connect();
    await fetchQueue();
  } catch (e) {
    toast.add({
      title: "Gagal memuat overlay",
      description: e instanceof Error ? e.message : "Coba lagi.",
      color: "error",
    });
  }
}

onMounted(() => {
  origin.value = window.location.origin;
  load();
});
</script>

<template>
  <UDashboardPanel id="overlay">
    <template #header>
      <UDashboardNavbar title="Overlay">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UBadge
            :color="displayOnline ? 'success' : 'neutral'"
            variant="soft"
            :icon="displayOnline ? 'i-lucide-circle-check' : 'i-lucide-circle-slash'"
          >
            {{ displayOnline ? "Display online" : "Display offline" }}
          </UBadge>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            aria-label="Muat ulang"
            @click="load"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <UAlert
          v-if="!connected"
          :icon="reconnecting ? 'i-lucide-loader-circle' : 'i-lucide-wifi-off'"
          :color="reconnecting ? 'info' : 'warning'"
          variant="soft"
          :title="reconnecting ? 'Menyambungkan ulang…' : 'Kontrol terputus'"
          description="Perintah akan dikirim lewat REST sampai koneksi realtime kembali."
        />

        <!-- Kontrol utama -->
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Kontrol playback</h2>
          </template>

          <div class="flex flex-wrap items-center gap-2">
            <UButton
              :label="paused ? 'Lanjutkan' : 'Jeda'"
              :icon="paused ? 'i-lucide-play' : 'i-lucide-pause'"
              :color="paused ? 'primary' : 'neutral'"
              :variant="paused ? 'solid' : 'outline'"
              :disabled="busy"
              @click="run(paused ? resume : pause, paused ? 'Playback dilanjutkan' : 'Playback dijeda')"
            />
            <UButton
              label="Lewati"
              icon="i-lucide-skip-forward"
              color="neutral"
              variant="outline"
              :disabled="busy || activeItems.length === 0"
              @click="skipOpen = true"
            />
            <UButton
              label="Bersihkan antrean"
              icon="i-lucide-trash-2"
              color="error"
              variant="outline"
              :disabled="busy"
              @click="purgeOpen = true"
            />
            <UBadge v-if="paused" color="warning" variant="soft">Dijeda</UBadge>
          </div>
        </UCard>

        <!-- URL display -->
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">URL OBS</h2>
          </template>
          <div class="flex items-center gap-2">
            <code class="min-w-0 flex-1 truncate rounded bg-elevated px-2 py-1 text-sm">
              {{ displayUrl || "—" }}
            </code>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              aria-label="Salin URL display"
              :disabled="!displayUrl"
              @click="copy(displayUrl, 'URL display')"
            />
          </div>
        </UCard>

        <!-- Antrean aktif -->
        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <h2 class="font-semibold text-highlighted">
              Antrean ({{ activeItems.length }})
            </h2>
          </template>

          <UEmpty
            v-if="activeItems.length === 0"
            icon="i-lucide-inbox"
            title="Antrean kosong"
            description="Donasi yang sudah dibayar akan otomatis masuk ke sini."
          />

          <ul v-else class="divide-y divide-default">
            <li
              v-for="item in activeItems"
              :key="item.overlayEventId"
              class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="truncate font-medium text-highlighted">
                    {{ donorLabel(item) }}
                  </p>
                  <UBadge
                    :color="overlayStatusMeta[item.status].color"
                    variant="soft"
                    size="sm"
                  >
                    {{ overlayStatusMeta[item.status].label }}
                  </UBadge>
                  <UBadge
                    v-if="currentId === item.overlayEventId"
                    color="primary"
                    variant="soft"
                    size="sm"
                  >
                    Sedang diputar
                  </UBadge>
                </div>
                <p class="text-sm text-muted">
                  {{ item.type }} · {{ formatIdr(item.amount) }} ·
                  {{ item.durationSeconds }}s
                </p>
              </div>
              <UButton
                label="Retry"
                icon="i-lucide-rotate-cw"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="busy"
                @click="run(() => retry(item.overlayEventId), 'Item dikembalikan ke antrean')"
              />
            </li>
          </ul>
        </UCard>

        <!-- Sudah diputar -->
        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <h2 class="font-semibold text-highlighted">
              Sudah diputar ({{ playedItems.length }})
            </h2>
          </template>

          <UEmpty
            v-if="playedItems.length === 0"
            icon="i-lucide-history"
            title="Belum ada yang diputar"
          />

          <ul v-else class="divide-y divide-default">
            <li
              v-for="item in playedItems"
              :key="item.overlayEventId"
              class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-highlighted">
                  {{ donorLabel(item) }}
                </p>
                <p class="text-sm text-muted">
                  {{ formatIdr(item.amount) }} · diputar
                  {{ formatDateTime(item.playedAt) }}
                </p>
              </div>
              <UButton
                label="Putar ulang"
                icon="i-lucide-rotate-cw"
                color="neutral"
                variant="outline"
                size="sm"
                :disabled="busy"
                @click="run(() => retry(item.overlayEventId), 'Item dikembalikan ke antrean')"
              />
            </li>
          </ul>
        </UCard>

        <!-- Gagal / dilewati -->
        <UCard v-if="failedItems.length > 0" :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">
                Gagal / dilewati ({{ failedItems.length }})
              </h2>
              <UButton
                label="Retry semua gagal"
                icon="i-lucide-rotate-ccw"
                color="neutral"
                variant="outline"
                size="sm"
                :disabled="busy"
                @click="run(() => retryAll('FAILED'), 'Item gagal dikembalikan ke antrean')"
              />
            </div>
          </template>

          <ul class="divide-y divide-default">
            <li
              v-for="item in failedItems"
              :key="item.overlayEventId"
              class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="truncate font-medium text-highlighted">
                    {{ donorLabel(item) }}
                  </p>
                  <UBadge
                    :color="overlayStatusMeta[item.status].color"
                    variant="soft"
                    size="sm"
                  >
                    {{ overlayStatusMeta[item.status].label }}
                  </UBadge>
                </div>
                <p class="text-sm text-muted">
                  {{ formatIdr(item.amount) }} · {{ item.attempts }} percobaan
                </p>
              </div>
              <UButton
                label="Retry"
                icon="i-lucide-rotate-cw"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="busy"
                @click="run(() => retry(item.overlayEventId), 'Item dikembalikan ke antrean')"
              />
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Konfirmasi skip -->
  <UModal
    v-model:open="skipOpen"
    title="Lewati item ini?"
    description="Media yang sedang diputar akan dihentikan dan item ditandai dilewati."
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <UButton label="Batal" color="neutral" variant="outline" @click="skipOpen = false" />
      <UButton label="Lewati" color="error" :loading="busy" @click="confirmSkip" />
    </template>
  </UModal>

  <!-- Konfirmasi purge -->
  <UModal
    v-model:open="purgeOpen"
    title="Bersihkan antrean menunggu?"
    description="Semua item berstatus MENUNGGU akan dihapus dari antrean. Item yang sudah diputar tidak terpengaruh."
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <UButton label="Batal" color="neutral" variant="outline" @click="purgeOpen = false" />
      <UButton label="Bersihkan" color="error" :loading="busy" @click="confirmPurge" />
    </template>
  </UModal>
</template>
