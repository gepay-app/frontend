import type {
  CreatePayoutDestinationPayload,
  PayoutDestination,
} from "~/types/payment";
import type { PayoutChannel } from "~/types/donation";

// Rekening tujuan pencairan milik creator + daftar channel PAYOUT untuk form.
export const usePayoutDestinations = () => {
  const { get, post, del } = useApi();
  const destinations = ref<PayoutDestination[]>([]);
  const channels = ref<PayoutChannel[]>([]);
  const loading = ref(false);

  const fetchDestinations = async () => {
    loading.value = true;
    try {
      destinations.value = await get<PayoutDestination[]>("/payout-destinations");
    } finally {
      loading.value = false;
    }
  };

  const fetchChannels = async () => {
    channels.value = await get<PayoutChannel[]>("/channels/payout");
  };

  const create = async (payload: CreatePayoutDestinationPayload) => {
    const created = await post<PayoutDestination>("/payout-destinations", payload);
    await fetchDestinations();
    return created;
  };

  const setDefault = async (id: string) => {
    await post<PayoutDestination>(`/payout-destinations/${id}/default`);
    await fetchDestinations();
  };

  const deactivate = async (id: string) => {
    await del<void>(`/payout-destinations/${id}`);
    await fetchDestinations();
  };

  return {
    destinations,
    channels,
    loading,
    fetchDestinations,
    fetchChannels,
    create,
    setDefault,
    deactivate,
  };
};
