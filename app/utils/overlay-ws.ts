// app/utils/overlay-ws.ts
// Helper WebSocket overlay. Backend memakai protokol JSON sederhana (BUKAN
// STOMP), envelope: { v, type, id?, data? }. Path WS berada di origin backend
// TANPA prefix "/api/v1" (mis. /ws/overlay/display), jadi URL dibangun dari
// `apiBase` (origin) — lihat §3.1 todo.md.
import type { OverlayPlayPayload, OverlayQueueItem } from "~/types/donation";

export interface OverlayEnvelope<T = unknown> {
  v: number;
  type: string;
  id?: string | null;
  data?: T;
}

// Data payload per tipe pesan server→client (display & control).
export interface OverlayHelloData {
  creatorId: string;
  queueDepth: number;
  paused: boolean;
}

export interface OverlayStateData {
  paused: boolean;
  displayOnline: boolean;
  overlayKey: string;
  current: string | null;
  queue: OverlayQueueItem[];
}

export interface OverlayPlayMessage extends OverlayEnvelope<OverlayPlayPayload> {
  type: "play";
}

export interface OverlaySkipData {
  overlayEventId: string | null;
}

export interface OverlayPausedData {
  paused: boolean;
}

export interface OverlayKeyRotatedData {
  overlayKey: string;
}

// Bangun URL WebSocket absolut dari origin backend. `path` boleh dengan/tanpa
// leading slash (mis. "/ws/overlay/display"). `query` dipakai untuk `key`
// (display) atau `token` (control).
export function buildOverlayWsUrl(
  path: string,
  query?: Record<string, string>,
): string {
  const { apiBase } = useRuntimeConfig().public;
  // apiBase dari env = origin absolut. Kalau ternyata relatif, tempel ke origin
  // halaman (hanya jalan di browser — WS memang client-only).
  const base = apiBase.startsWith("http")
    ? apiBase
    : `${window.location.origin}${apiBase}`;
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

// Parse payload mentah jadi envelope. Aman: balikin null kalau bukan JSON
// objek yang punya field `type` (jangan lempar, WS bisa kirim apa saja).
export function parseOverlayEnvelope(raw: string): OverlayEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      typeof (parsed as { type?: unknown }).type === "string"
    ) {
      return parsed as OverlayEnvelope;
    }
    return null;
  } catch {
    return null;
  }
}

// Encode pesan client→server (ack/heartbeat/pause/skip/retry/retryAll/...).
// Field tambahan ditempel di top-level karena backend membacanya langsung
// (`payload.get("id")`, `payload.get("fromStatus")`).
export function encodeOverlayMessage(
  type: string,
  fields?: Record<string, unknown>,
): string {
  return JSON.stringify({ type, ...(fields ?? {}) });
}
