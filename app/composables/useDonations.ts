import type {
  CreatorDonation,
  CursorPage,
  DonationPage,
  UpdateDonationPagePayload,
} from "~/types/donation";

const PAGE_SIZE = 20;

// Data sisi creator: feed donasi (cursor) + halaman donasi milik sendiri
// (termasuk overlayKey). Dipakai dashboard donasi & halaman pengaturan page.
export const useDonations = () => {
  const { get, put, post } = useApi();

  const donations = ref<CreatorDonation[]>([]);
  const myPage = ref<DonationPage | null>(null);
  const loading = ref(false);
  const loadingMore = ref(false);
  const hasNext = ref(false);
  let nextCursor: string | null = null;

  const fetchMine = async () => {
    loading.value = true;
    try {
      const page = await get<CursorPage<CreatorDonation>>("/donations/me", {
        query: { size: PAGE_SIZE },
      });
      donations.value = page.items;
      nextCursor = page.nextCursor;
      hasNext.value = page.hasNext;
    } finally {
      loading.value = false;
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore.value) return;
    loadingMore.value = true;
    try {
      // `cursor` keyset by id; hanya kirim kalau ada.
      const page = await get<CursorPage<CreatorDonation>>("/donations/me", {
        query: { size: PAGE_SIZE, cursor: nextCursor },
      });
      donations.value = [...donations.value, ...page.items];
      nextCursor = page.nextCursor;
      hasNext.value = page.hasNext;
    } finally {
      loadingMore.value = false;
    }
  };

  const fetchMyPage = async () => {
    myPage.value = await get<DonationPage>("/donations/me/page");
    return myPage.value;
  };

  const updateMyPage = async (payload: UpdateDonationPagePayload) => {
    myPage.value = await put<DonationPage>("/donations/me/page", payload);
    return myPage.value;
  };

  const rotateOverlayKey = async () => {
    const result = await post<{ overlayKey: string }>(
      "/donations/me/page/overlay-key/rotate",
    );
    if (myPage.value) myPage.value.overlayKey = result.overlayKey;
    return result.overlayKey;
  };

  return {
    donations,
    myPage,
    loading,
    loadingMore,
    hasNext,
    fetchMine,
    loadMore,
    fetchMyPage,
    updateMyPage,
    rotateOverlayKey,
  };
};
