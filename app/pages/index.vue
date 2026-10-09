<script setup lang="ts">
useSeoMeta({
  title: "GePay — Pembayaran dan buku besar yang rapi",
  description:
    "GePay menyatukan pemrosesan pembayaran dan pencatatan buku besar, jadi setiap transaksi langsung tercatat dan siap diaudit.",
});

const features = [
  {
    title: "Pembayaran",
    description:
      "Terima pembayaran lewat satu API dengan status yang jelas dan mudah dilacak.",
    icon: "i-lucide-credit-card",
  },
  {
    title: "Buku besar",
    description:
      "Setiap transaksi otomatis menjadi jurnal berpasangan yang siap diaudit.",
    icon: "i-lucide-book-open",
  },
  {
    title: "Rekonsiliasi",
    description:
      "Cocokkan mutasi bank dengan catatan internal tanpa spreadsheet manual.",
    icon: "i-lucide-git-compare",
  },
  {
    title: "Peran & akses",
    description:
      "Atur siapa yang boleh melihat, membuat, dan menyetujui transaksi.",
    icon: "i-lucide-shield-check",
  },
];

const steps = [
  {
    title: "Buat akun",
    description: "Daftar dengan email atau Google dan verifikasi dalam hitungan menit.",
    icon: "i-lucide-user-plus",
  },
  {
    title: "Hubungkan sumber dana",
    description: "Tambahkan kredensial pembayaran lalu mulai menerima transaksi.",
    icon: "i-lucide-plug",
  },
  {
    title: "Pantau & rekonsiliasi",
    description: "Lihat arus kas dan jurnal dari satu dashboard yang sama.",
    icon: "i-lucide-line-chart",
  },
];

const chartBars = [42, 58, 47, 72, 55, 66, 88, 61];

const stats = [
  { label: "Saldo", value: "Rp 48,2 jt" },
  { label: "Masuk bulan ini", value: "Rp 12,4 jt" },
  { label: "Transaksi", value: "1.284" },
];
</script>

<template>
  <div>
    <UPageHero
      headline="Pembayaran & buku besar"
      title="Catat setiap transaksi, dari bayar sampai buku besar."
      description="GePay menyatukan pemrosesan pembayaran dan pencatatan akuntansi. Uang masuk tercatat otomatis, laporan tetap sinkron, dan tim bekerja dari satu sumber data yang sama."
      :links="[
        {
          label: 'Mulai gratis',
          to: '/register',
          size: 'xl',
          trailingIcon: 'i-lucide-arrow-right',
        },
        {
          label: 'Lihat fitur',
          to: '#fitur',
          size: 'xl',
          color: 'neutral',
          variant: 'outline',
        },
      ]"
    >
      <div class="rounded-xl border border-default bg-elevated shadow-sm">
        <div
          class="flex items-center gap-1.5 border-b border-default px-4 py-3"
        >
          <span class="size-2.5 rounded-full bg-error/60" />
          <span class="size-2.5 rounded-full bg-warning/60" />
          <span class="size-2.5 rounded-full bg-success/60" />
          <span class="ml-3 text-xs text-dimmed">dashboard.gepay.id</span>
        </div>

        <div class="grid grid-cols-3 gap-3 p-4">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-lg border border-default p-3"
          >
            <p class="text-xs text-muted">{{ stat.label }}</p>
            <p class="mt-1 text-sm font-semibold text-highlighted sm:text-base">
              {{ stat.value }}
            </p>
          </div>
        </div>

        <div class="border-t border-default p-4">
          <div class="flex h-28 items-end gap-2">
            <div
              v-for="(bar, index) in chartBars"
              :key="index"
              class="flex-1 rounded-t bg-primary/80"
              :style="{ height: `${bar}%` }"
            />
          </div>
        </div>
      </div>
    </UPageHero>

    <UPageSection
      id="fitur"
      headline="Fitur"
      title="Semua yang dibutuhkan untuk mengelola uang"
      description="Dari penerimaan pembayaran sampai laporan keuangan, dikerjakan dalam satu alur."
      :features="features"
    />

    <UPageSection
      id="cara-kerja"
      headline="Cara kerja"
      title="Mulai dalam tiga langkah"
      description="Tidak perlu instalasi atau migrasi data yang rumit."
    >
      <div class="grid gap-8 sm:grid-cols-3">
        <div v-for="(step, index) in steps" :key="step.title">
          <div class="flex items-center gap-3">
            <span
              class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <UIcon :name="step.icon" class="size-5" />
            </span>
            <span class="text-sm font-medium text-dimmed">
              0{{ index + 1 }}
            </span>
          </div>
          <h3 class="mt-4 font-semibold text-highlighted">{{ step.title }}</h3>
          <p class="mt-1 text-sm text-muted">{{ step.description }}</p>
        </div>
      </div>
    </UPageSection>

    <UPageCTA
      title="Buat laporan keuangan lebih cepat"
      description="Berhenti mencocokkan angka secara manual. Mulai dari gratis, tanpa kartu kredit."
      variant="soft"
      :links="[
        { label: 'Mulai gratis', to: '/register' },
        {
          label: 'Masuk',
          to: '/login',
          color: 'neutral',
          variant: 'subtle',
          trailingIcon: 'i-lucide-arrow-right',
        },
      ]"
    />
  </div>
</template>
