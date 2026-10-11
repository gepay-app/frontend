import type { Balance } from "~/types/payment";

// Saldo creator (pending / available / hold). Akun ledger di-provision lazy
// di backend saat pertama dibaca, jadi user baru dapat 0 (bukan error).
export const useBalance = () => {
  const { get } = useApi();
  const balance = ref<Balance | null>(null);
  const loading = ref(false);

  const refresh = async () => {
    loading.value = true;
    try {
      balance.value = await get<Balance>("/balance");
    } finally {
      loading.value = false;
    }
  };

  return { balance, loading, refresh };
};
