import type {
  CreateDonationPayload,
  Donation,
  DonationStatus,
  PayinChannel,
  PublicDonationPage,
} from "~/types/donation";

const TERMINAL_STATUSES: DonationStatus[] = ["PAID", "EXPIRED", "FAILED"];

// Alur donor (publik): halaman donasi → channel PAYIN (+fee) → buat donasi →
// pantau status pembayaran. SSE dipakai sebagai kanal utama; polling 2,5s
// menjadi jaring pengaman karena SSE bukan sumber kebenaran (lihat readme
// backend §7.4).
export const useDonationCheckout = () => {
  const { get, post } = useApi();
  const { apiBase } = useRuntimeConfig().public;

  const page = ref<PublicDonationPage | null>(null);
  const channels = ref<PayinChannel[]>([]);
  const donation = ref<Donation | null>(null);
  const status = ref<DonationStatus | null>(null);
  const loadingChannels = ref(false);
  const submitting = ref(false);

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let eventSource: EventSource | null = null;

  const fetchPage = async (slug: string) => {
    page.value = await get<PublicDonationPage>(
      `/donation-pages/${encodeURIComponent(slug)}`,
    );
    return page.value;
  };

  // `amount` opsional: kalau diisi, backend menghitung pgFeeAmount/
  // totalChargedAmount per channel (fee ditanggung donor).
  const fetchChannels = async (amount?: number) => {
    loadingChannels.value = true;
    try {
      channels.value = await get<PayinChannel[]>("/channels/payin", {
        query: amount && amount > 0 ? { amount } : {},
      });
    } finally {
      loadingChannels.value = false;
    }
  };

  const create = async (payload: CreateDonationPayload) => {
    const created = await post<Donation>("/donations", payload);
    donation.value = created;
    status.value = created.status;
    return created;
  };

  const fetchStatus = async (donationId: string) => {
    const fresh = await get<Donation>(`/donations/${donationId}`);
    donation.value = fresh;
    status.value = fresh.status;
    return fresh;
  };

  const closeStream = () => {
    eventSource?.close();
    eventSource = null;
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const isTerminal = (value: DonationStatus | null) =>
    value != null && TERMINAL_STATUSES.includes(value);

  const startPolling = (donationId: string, intervalMs = 2500) => {
    stopPolling();
    pollTimer = setInterval(async () => {
      try {
        const fresh = await fetchStatus(donationId);
        if (isTerminal(fresh.status)) {
          stopPolling();
          closeStream();
        }
      } catch {
        // Diamkan; interval berikutnya mencoba lagi.
      }
    }, intervalMs);
  };

  // EventSource tidak bisa set header, tapi endpoint stream publik — aman.
  const subscribe = (donationId: string) => {
    if (!import.meta.client || typeof EventSource === "undefined") return;
    closeStream();
    eventSource = new EventSource(
      `${apiBase}/api/v1/donations/${donationId}/stream`,
    );
    eventSource.addEventListener("paid", () => {
      status.value = "PAID";
      void fetchStatus(donationId).catch(() => {});
      closeStream();
      stopPolling();
    });
    eventSource.onerror = () => {
      // Biarkan polling yang jalan; jangan spam reconnect.
      closeStream();
    };
  };

  const watchStatus = (donationId: string) => {
    subscribe(donationId);
    startPolling(donationId);
  };

  onScopeDispose(() => {
    stopPolling();
    closeStream();
  });

  return {
    page,
    channels,
    donation,
    status,
    loadingChannels,
    submitting,
    fetchPage,
    fetchChannels,
    create,
    fetchStatus,
    watchStatus,
    stopPolling,
    closeStream,
  };
};
