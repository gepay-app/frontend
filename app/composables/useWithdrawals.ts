import type {
  CreateWithdrawalPayload,
  Withdrawal,
  WithdrawalConfig,
  WithdrawalStatus,
} from "~/types/payment";

const TERMINAL_STATUSES: WithdrawalStatus[] = [
  "PAID",
  "FAILED",
  "CANCELLED",
  "REJECTED",
];

// Riwayat & pembuatan penarikan creator. Polling dipakai untuk memantau
// status sampai terminal karena backend belum menyediakan SSE untuk withdraw.
export const useWithdrawals = () => {
  const { get, post } = useApi();
  const withdrawals = ref<Withdrawal[]>([]);
  const config = ref<WithdrawalConfig | null>(null);
  const loading = ref(false);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const fetchWithdrawals = async () => {
    loading.value = true;
    try {
      withdrawals.value = await get<Withdrawal[]>("/withdrawals");
    } finally {
      loading.value = false;
    }
  };

  // Batas nominal & biaya berasal dari backend (route + fee config aktif),
  // bukan hardcode di FE.
  const fetchConfig = async (destinationId: string) => {
    config.value = await get<WithdrawalConfig>("/withdrawals/config", {
      query: { destinationId },
    });
  };

  const clearConfig = () => {
    config.value = null;
  };

  const create = async (payload: CreateWithdrawalPayload) => {
    const created = await post<Withdrawal>("/withdrawals", payload);
    await fetchWithdrawals();
    return created;
  };

  const getById = (id: string) => get<Withdrawal>(`/withdrawals/${id}`);

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPolling = (id: string, intervalMs = 5000) => {
    stopPolling();
    pollTimer = setInterval(async () => {
      try {
        const fresh = await getById(id);
        const index = withdrawals.value.findIndex((w) => w.id === id);
        if (index >= 0) withdrawals.value[index] = fresh;
        if (TERMINAL_STATUSES.includes(fresh.status)) {
          stopPolling();
          await fetchWithdrawals();
        }
      } catch {
        // Diamkan; interval berikutnya akan mencoba lagi.
      }
    }, intervalMs);
  };

  onScopeDispose(stopPolling);

  return {
    withdrawals,
    config,
    loading,
    fetchWithdrawals,
    fetchConfig,
    clearConfig,
    create,
    getById,
    startPolling,
    stopPolling,
  };
};
