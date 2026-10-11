<script setup lang="ts">
import type { OverlayPlayPayload } from "~/types/donation";

// Halaman display OBS: layout kosong + latar transparan (lihat main.css
// `.overlay-active`). Tanpa UI kontrol — dikendalikan dari halaman controller
// lewat WebSocket.
definePageMeta({ layout: false });

useSeoMeta({ title: "Overlay OBS" });

const route = useRoute();
const overlayKey = computed(() => String(route.params.key));

const { connected, reconnecting, connect, disconnect, ack } =
  useOverlayDisplay();

const current = ref<OverlayPlayPayload | null>(null);
const paused = ref(false);
const durationMs = ref(0);
const remainingMs = ref(0);

let tick: ReturnType<typeof setInterval> | null = null;
let lastTick = 0;

function ensureTick() {
  if (tick) return;
  lastTick = Date.now();
  tick = setInterval(() => {
    const now = Date.now();
    const delta = now - lastTick;
    lastTick = now;
    if (paused.value || !current.value) return;
    remainingMs.value = Math.max(remainingMs.value - delta, 0);
    if (remainingMs.value <= 0) finish();
  }, 200);
}

function startPlayback(payload: OverlayPlayPayload) {
  current.value = payload;
  paused.value = false;
  durationMs.value = Math.max(payload.durationSeconds, 1) * 1000;
  remainingMs.value = durationMs.value;
  ensureTick();
}

// Selesai: ack tepat sekali ke server, lalu kosongkan layar.
function finish() {
  const id = current.value?.overlayEventId;
  current.value = null;
  remainingMs.value = 0;
  if (id) ack(id);
}

// Sinyal `skip`/`paused` dari server (controller/OBS) — sudah diputuskan backend,
// display cukup berhenti/menjeda.
function stopCurrent() {
  current.value = null;
  remainingMs.value = 0;
}

function setPaused(value: boolean) {
  paused.value = value;
}

function start() {
  if (!import.meta.client) return;
  document.documentElement.classList.add("overlay-active");
  connect(overlayKey.value, {
    onPlay: startPlayback,
    onSkip: stopCurrent,
    onPaused: setPaused,
  });
}

function stop() {
  if (!import.meta.client) return;
  document.documentElement.classList.remove("overlay-active");
  disconnect();
  if (tick) {
    clearInterval(tick);
    tick = null;
  }
}

const progress = computed(() => {
  if (durationMs.value <= 0) return 0;
  return Math.min(
    Math.max(remainingMs.value / durationMs.value, 0),
    1,
  );
});

const embedUrl = computed(() => {
  const videoId = current.value?.videoId;
  return videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    : "";
});

watch(overlayKey, () => {
  stop();
  start();
});

onMounted(start);
onBeforeUnmount(stop);
</script>

<template>
  <div class="fixed inset-0 overflow-hidden">
    <!-- Indikator koneksi: cuma saat PUTUS, supaya operator sadar. -->
    <div
      v-if="!connected"
      class="absolute top-4 left-4 z-10 rounded-lg bg-red-600/90 px-3 py-1.5 text-sm font-medium text-white"
    >
      <span class="inline-flex items-center gap-2">
        <UIcon name="i-lucide-wifi-off" class="size-4" />
        {{ reconnecting ? "Menyambungkan ulang…" : "Overlay terputus" }}
      </span>
    </div>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      leave-active-class="transition duration-300 ease-in"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div v-if="current" class="absolute inset-0">
        <!-- YouTube: video penuh layar + banner donatur di bawah -->
        <template v-if="current.type === 'YOUTUBE' && embedUrl">
          <iframe
            class="h-full w-full"
            :src="embedUrl"
            title="Donasi video"
            allow="autoplay; encrypted-media"
            frameborder="0"
          />
          <div
            class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-black/80 px-8 py-4 text-white"
          >
            <p class="truncate text-2xl">
              <span class="font-semibold">{{ current.donorName }}</span>
              <span class="opacity-80"> berdonasi</span>
            </p>
            <p class="shrink-0 text-3xl font-bold tracking-tight">
              {{ formatIdr(current.amount) }}
            </p>
          </div>
        </template>

        <!-- Teks: kartu di tengah -->
        <div v-else class="flex h-full items-center justify-center p-8">
          <div
            class="flex max-w-3xl flex-col items-center gap-3 rounded-3xl bg-black/70 px-10 py-8 text-center text-white shadow-2xl backdrop-blur"
          >
            <p class="text-2xl font-semibold">
              {{ current.donorName }}
              <span class="font-normal opacity-80">berdonasi</span>
            </p>
            <p class="text-5xl font-bold tracking-tight">
              {{ formatIdr(current.amount) }}
            </p>
            <p
              v-if="current.message"
              class="max-w-2xl text-xl leading-snug whitespace-pre-line"
            >
              {{ current.message }}
            </p>
          </div>
        </div>

        <!-- Progress bar durasi -->
        <div class="absolute inset-x-0 bottom-0 h-1.5 w-full bg-white/20">
          <div
            class="h-full bg-white transition-[width] duration-200 ease-linear"
            :style="{ width: `${progress * 100}%` }"
          />
        </div>

        <div
          v-if="paused"
          class="absolute top-4 right-4 rounded-lg bg-amber-500/90 px-3 py-1.5 text-sm font-medium text-black"
        >
          Dijeda
        </div>
      </div>
    </Transition>
  </div>
</template>
