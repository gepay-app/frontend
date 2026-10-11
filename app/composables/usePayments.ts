import type { Payment } from "~/types/payment";

// Pembayaran masuk (earnings) creator. Backend membatasi ke current user.
export const usePayments = () => {
  const { get } = useApi();
  const payments = ref<Payment[]>([]);
  const loading = ref(false);

  const fetchPayments = async () => {
    loading.value = true;
    try {
      payments.value = await get<Payment[]>("/payments");
    } finally {
      loading.value = false;
    }
  };

  return { payments, loading, fetchPayments };
};
