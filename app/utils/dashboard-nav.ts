import type { NavigationMenuItem } from "@nuxt/ui";
import type { Role } from "~/types/auth";

// Satu sumber kebenaran untuk menu sidebar. Dipakai shell dashboard (render menu)
// dan halaman placeholder `[...slug].vue` (judul halaman). Label cukup ditulis
// sekali di sini.

export interface DashboardNavItem {
  label: string;
  icon: string;
  // `to` kosong = item induk (dropdown), isinya `children`.
  to?: string;
  badge?: string;
  children?: DashboardNavItem[];
}

export interface DashboardNavSection {
  label: string;
  // Kalau diisi, section cuma tampil untuk role yang cocok (UI-only guard;
  // enforcement asli tetap di backend).
  roles?: Role[];
  items: DashboardNavItem[];
}

// ---------------------------------------------------------------------------
// Menu dashboard USER  →  /dashboard/**
// ---------------------------------------------------------------------------
export const dashboardSections: DashboardNavSection[] = [
  {
    label: "Beranda",
    items: [
      {
        label: "Ringkasan",
        icon: "i-lucide-layout-dashboard",
        to: "/dashboard",
      },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      {
        label: "Pengaturan",
        icon: "i-lucide-settings",
        to: "/dashboard/settings",
      },
    ],
  },

  // Area donasi creator — cuma tampil buat role CREATOR.
  {
    label: "Donasi",
    roles: ["CREATOR"],
    items: [
      {
        label: "Donasi masuk",
        icon: "i-lucide-hand-coins",
        to: "/dashboard/donations",
      },
      {
        label: "Halaman donasi",
        icon: "i-lucide-layout-template",
        to: "/dashboard/donation-page",
      },
      {
        label: "Overlay",
        icon: "i-lucide-monitor-play",
        to: "/dashboard/overlay",
      },
    ],
  },

  // Area keuangan creator — cuma tampil buat role CREATOR (UI-only guard;
  // backend tetap yang menentukan lewat @PreAuthorize).
  {
    label: "Keuangan",
    roles: ["CREATOR"],
    items: [
      {
        label: "Pembayaran",
        icon: "i-lucide-receipt",
        to: "/dashboard/payments",
      },
      {
        label: "Pencairan",
        icon: "i-lucide-wallet",
        to: "/dashboard/payouts",
      },
    ],
  },

  // =========================================================================
  // CONTOH — tinggal hapus komentarnya kalau butuh. Tiga pola umum:
  // =========================================================================

  // (a) SECTION BARU: tambah satu objek { label, items } ke array ini.
  // {
  //   label: "Donasi",
  //   items: [
  //     { label: "Semua donasi", icon: "i-lucide-hand-coins", to: "/dashboard/donations" },
  //     { label: "Halaman donasi", icon: "i-lucide-layout-template", to: "/dashboard/donations/page" },
  //   ],
  // },

  // (b) DROPDOWN (menu dalam menu): item induk TANPA `to`, isi `children`.
  // {
  //   label: "Keuangan",
  //   items: [
  //     {
  //       label: "Buku besar",
  //       icon: "i-lucide-book-open",
  //       children: [
  //         { label: "Jurnal", icon: "i-lucide-book-open", to: "/dashboard/ledger" },
  //         { label: "Daftar akun", icon: "i-lucide-layers", to: "/dashboard/ledger/accounts" },
  //       ],
  //     },
  //   ],
  // },

  // (c) SECTION DENGAN SATU LINK SAJA: sama seperti section "Beranda" di atas,
  //     `items` boleh cuma berisi satu item.
  // {
  //   label: "Bantuan",
  //   items: [
  //     { label: "Pusat bantuan", icon: "i-lucide-circle-help", to: "/dashboard/help" },
  //   ],
  // },
];

// ---------------------------------------------------------------------------
// Menu dashboard ADMIN  →  /internal/**   (cuma tampil buat ADMIN/SUPER_ADMIN)
// ---------------------------------------------------------------------------
export const internalSections: DashboardNavSection[] = [
  {
    label: "Admin",
    roles: ["ADMIN", "SUPER_ADMIN"],
    items: [
      {
        label: "Ringkasan admin",
        icon: "i-lucide-shield-check",
        to: "/internal",
      },
    ],
  },

  // Pola penambahan sama seperti `dashboardSections` di atas:
  // - SECTION baru       → { label, roles: ["ADMIN"], items: [...] }
  // - DROPDOWN           → item induk tanpa `to` + `children`
  // - SATU LINK          → section dengan satu item
];

function isPathActive(target: string, current: string): boolean {
  return current === target || current.startsWith(`${target}/`);
}

function toMenuItem(
  item: DashboardNavItem,
  currentPath: string,
): NavigationMenuItem {
  // Item induk (punya children) tidak punya `to` sendiri, jadi status aktifnya
  // harus dihitung manual: nyala & kebuka kalau salah satu anaknya sedang dibuka.
  // NavigationMenu tidak menaikkan status aktif dari anak ke induk.
  const childActive =
    item.children?.some(
      (child) => child.to && isPathActive(child.to, currentPath),
    ) ?? false;

  return {
    label: item.label,
    icon: item.icon,
    ...(item.to ? { to: item.to } : {}),
    ...(item.badge ? { badge: item.badge } : {}),
    ...(childActive ? { active: true, defaultOpen: true } : {}),
    ...(item.children
      ? {
          children: item.children.map((child) => ({
            label: child.label,
            icon: child.icon,
            to: child.to,
          })),
        }
      : {}),
  };
}

// Ubah section jadi `NavigationMenuItem[][]`. Tiap section dikasih item
// `type: "label"` sebagai judul section. `currentPath` dipakai buat nentuin
// item induk mana yang aktif.
export function buildDashboardNavItems(
  sections: DashboardNavSection[],
  currentPath = "",
): NavigationMenuItem[][] {
  return sections.map((section) => [
    { label: section.label, type: "label" as const },
    ...section.items.map((item) => toMenuItem(item, currentPath)),
  ]);
}

// Peta path → item, buat nyari judul halaman di halaman placeholder.
function buildNavIndex(
  sections: DashboardNavSection[],
): Map<string, DashboardNavItem> {
  const index = new Map<string, DashboardNavItem>();
  for (const section of sections) {
    for (const item of section.items) {
      if (item.to) index.set(item.to, item);
      for (const child of item.children ?? []) {
        if (child.to) index.set(child.to, child);
      }
    }
  }
  return index;
}

const dashboardNavIndex = buildNavIndex(dashboardSections);
const internalNavIndex = buildNavIndex(internalSections);

export function findDashboardNav(path: string): DashboardNavItem | null {
  return dashboardNavIndex.get(path) ?? null;
}

export function findInternalNav(path: string): DashboardNavItem | null {
  return internalNavIndex.get(path) ?? null;
}
