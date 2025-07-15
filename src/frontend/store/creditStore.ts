import { create } from "zustand";
import { UserCredit, Subscription } from "@prisma/client";
import { createNetworkService } from "@/shared/utils/network";
import { useAuthStore } from "./authStore";

interface CreditState {
  credits: UserCredit[];
  subscription: Subscription | null;
  isLoading: boolean;
  error: Error | null;
}

interface CreditActions {
  fetchCredits: () => Promise<UserCredit[]>;
  fetchSubscription: () => Promise<Subscription | null>;
  initialize: () => Promise<void>;
}

export type CreditStore = CreditState & CreditActions;

export const useCreditStore = create<CreditStore>((set) => {
  const getAccessToken = () => useAuthStore.getState().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    credits: [],
    subscription: null,
    isLoading: false,
    error: null,

    initialize: async () => {
      const authState = useAuthStore.getState();
      if (authState.isAuthenticated && authState.accessToken) {
        try {
          await Promise.all([
            (() => {
              return networkService.fetchCredits().then(credits => {
                set({ credits });
              });
            })(),
            (() => {
              return networkService.fetchSubscription().then(subscription => {
                set({ subscription });
              });
            })()
          ]);
        } catch (error) {
          console.error('Credit store initialization failed:', error);
          set({ error: error as Error });
        }
      }
    },

    fetchCredits: async () => {
      try {
        set({ isLoading: true, error: null });
        const credits = await networkService.fetchCredits();
        set({ credits, isLoading: false });
        return credits;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    fetchSubscription: async () => {
      try {
        set({ isLoading: true, error: null });
        const subscription = await networkService.fetchSubscription();
        set({ subscription, isLoading: false });
        return subscription;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },
  };
});
