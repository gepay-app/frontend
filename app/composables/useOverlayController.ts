import {
  buildOverlayWsUrl,
  encodeOverlayMessage,
  parseOverlayEnvelope,
  type OverlayEnvelope,
  type OverlayKeyRotatedData,
  type OverlayStateData,
} from "~/utils/overlay-ws";
import type { OverlayEventStatus, OverlayQueueItem } from "~/types/donation";

// Kontrol overlay milik creator. Aksi dikirim lewat WebSocket kontrol (token
// Firebase di query); kalau socket belum tersambung, fallback ke REST. State
// (paused/displayOnline/queue) datang dari pesan `state`; setelah tiap aksi
// server mengirim `state` baru.
export const useOverlayController = () => {
  const { $firebaseAuth } = useNuxtApp();
  const { get, post, del } = useApi();

  const connected = ref(false);
  const reconnecting = ref(false);
  const paused = ref(false);
  const displayOnline = ref(false);
  const overlayKey = ref("");
  const currentId = ref<string | null>(null);
  const queue = ref<OverlayQueueItem[]>([]);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let closedByUser = false;

  const isOpen = () => socket?.readyState === WebSocket.OPEN;

  const send = (type: string, fields?: Record<string, unknown>) => {
    if (isOpen()) socket?.send(encodeOverlayMessage(type, fields));
    return isOpen();
  };

  const applyState = (data: OverlayStateData) => {
    paused.value = data.paused;
    displayOnline.value = data.displayOnline;
    overlayKey.value = data.overlayKey;
    currentId.value = data.current;
    queue.value = data.queue ?? [];
  };

  const dispatch = (envelope: OverlayEnvelope) => {
    switch (envelope.type) {
      case "state":
        applyState(envelope.data as OverlayStateData);
        break;
      case "keyRotated":
        overlayKey.value =
          (envelope.data as OverlayKeyRotatedData | undefined)?.overlayKey ?? "";
        break;
    }
  };

  const scheduleReconnect = () => {
    if (closedByUser) return;
    reconnecting.value = true;
    const delay = Math.min(1000 * 2 ** attempts, 15000);
    attempts += 1;
    reconnectTimer = setTimeout(() => {
      open().catch(() => scheduleReconnect());
    }, delay);
  };

  const open = async () => {
    if (!import.meta.client || typeof WebSocket === "undefined") return;
    const token = await $firebaseAuth.currentUser?.getIdToken();
    if (!token) {
      reconnecting.value = false;
      return;
    }
    socket = new WebSocket(
      buildOverlayWsUrl("/ws/overlay/control", { token }),
    );
    socket.onopen = () => {
      connected.value = true;
      reconnecting.value = false;
      attempts = 0;
    };
    socket.onmessage = (event) => {
      const envelope = parseOverlayEnvelope(String(event.data));
      if (envelope) dispatch(envelope);
    };
    socket.onclose = () => {
      connected.value = false;
      scheduleReconnect();
    };
    socket.onerror = () => {
      socket?.close();
    };
  };

  const connect = async () => {
    closedByUser = false;
    attempts = 0;
    await open();
  };

  const disconnect = () => {
    closedByUser = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
    connected.value = false;
  };

  // --- Aksi: WS dulu, REST fallback ---
  const pause = async () => {
    if (!send("pause")) await post<void>("/donations/overlay/pause");
  };
  const resume = async () => {
    if (!send("resume")) await post<void>("/donations/overlay/resume");
  };
  const skip = async () => {
    if (!send("skip")) await post<void>("/donations/overlay/skip");
  };
  const purge = async () => {
    if (!send("purge")) await del<void>("/donations/overlay/queue");
  };
  const retry = async (id: string) => {
    if (!send("retry", { id })) {
      await post<void>(`/donations/overlay/${id}/retry`);
    }
  };
  const retryAll = async (fromStatus: OverlayEventStatus = "FAILED") => {
    if (!send("retryAll", { fromStatus })) {
      await post<void>("/donations/overlay/retry", undefined, {
        query: { fromStatus },
      });
    }
  };

  // Fallback/manual refresh daftar antrean lewat REST.
  const fetchQueue = async (status?: OverlayEventStatus) => {
    queue.value = await get<OverlayQueueItem[]>("/donations/overlay/queue", {
      query: status ? { status } : {},
    });
    return queue.value;
  };

  onScopeDispose(disconnect);

  return {
    connected,
    reconnecting,
    paused,
    displayOnline,
    overlayKey,
    currentId,
    queue,
    connect,
    disconnect,
    pause,
    resume,
    skip,
    purge,
    retry,
    retryAll,
    fetchQueue,
  };
};
