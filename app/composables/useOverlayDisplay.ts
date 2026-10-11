import {
  buildOverlayWsUrl,
  encodeOverlayMessage,
  parseOverlayEnvelope,
  type OverlayEnvelope,
  type OverlayHelloData,
  type OverlayPausedData,
  type OverlaySkipData,
} from "~/utils/overlay-ws";
import type { OverlayPlayPayload } from "~/types/donation";

export interface OverlayDisplayHandlers {
  onHello?: (data: OverlayHelloData) => void;
  onPlay?: (data: OverlayPlayPayload) => void;
  onSkip?: (overlayEventId: string | null) => void;
  onPaused?: (paused: boolean) => void;
}

// Klien display OBS: pasif, tanpa login. Hanya menerima `play`/`skip`/`paused`
// dari server dan mengirim `ack`/`heartbeat`. Auto-reconnect dengan backoff.
export const useOverlayDisplay = () => {
  const connected = ref(false);
  const reconnecting = ref(false);

  let socket: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let closedByUser = false;
  let overlayKey = "";
  let handlers: OverlayDisplayHandlers = {};

  const clearHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const isOpen = () => socket?.readyState === WebSocket.OPEN;

  const send = (message: string) => {
    if (isOpen()) socket?.send(message);
  };

  const ack = (overlayEventId: string) => {
    send(encodeOverlayMessage("ack", { id: overlayEventId }));
  };

  const dispatch = (envelope: OverlayEnvelope) => {
    switch (envelope.type) {
      case "hello":
        handlers.onHello?.(envelope.data as OverlayHelloData);
        break;
      case "play":
        handlers.onPlay?.(envelope.data as OverlayPlayPayload);
        break;
      case "skip":
        handlers.onSkip?.(
          (envelope.data as OverlaySkipData | undefined)?.overlayEventId ?? null,
        );
        break;
      case "paused":
        handlers.onPaused?.(
          (envelope.data as OverlayPausedData | undefined)?.paused ?? true,
        );
        break;
      case "resumed":
        handlers.onPaused?.(false);
        break;
    }
  };

  const scheduleReconnect = () => {
    if (closedByUser) return;
    reconnecting.value = true;
    const delay = Math.min(1000 * 2 ** attempts, 15000);
    attempts += 1;
    reconnectTimer = setTimeout(open, delay);
  };

  const open = () => {
    if (!import.meta.client || typeof WebSocket === "undefined") return;
    socket = new WebSocket(
      buildOverlayWsUrl("/ws/overlay/display", { key: overlayKey }),
    );
    socket.onopen = () => {
      connected.value = true;
      reconnecting.value = false;
      attempts = 0;
      clearHeartbeat();
      heartbeat = setInterval(
        () => send(encodeOverlayMessage("heartbeat")),
        10000,
      );
    };
    socket.onmessage = (event) => {
      const envelope = parseOverlayEnvelope(String(event.data));
      if (envelope) dispatch(envelope);
    };
    socket.onclose = () => {
      connected.value = false;
      clearHeartbeat();
      scheduleReconnect();
    };
    socket.onerror = () => {
      socket?.close();
    };
  };

  const connect = (key: string, displayHandlers?: OverlayDisplayHandlers) => {
    overlayKey = key;
    handlers = displayHandlers ?? {};
    closedByUser = false;
    attempts = 0;
    open();
  };

  const disconnect = () => {
    closedByUser = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    clearHeartbeat();
    socket?.close();
    socket = null;
    connected.value = false;
  };

  onScopeDispose(disconnect);

  return { connected, reconnecting, connect, disconnect, ack };
};
