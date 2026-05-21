import { create } from "zustand";
import { UserCredit, Subscription } from "../../generated/client";
import { createNetworkService } from "@/shared/utils/network";
import { useAuthStore } from "./authStore";
import {
  isRevenueCatUserCancellation,
  purchaseRevenueCatCredits,
} from "@/frontend/lib/revenueCatWeb";

interface CreditState {
  credits: UserCredit[];
  subscription: Subscription | null;
  isLoading: boolean;
  isPurchasing: boolean;
  error: Error | null;
}

interface CreditActions {
  fetchCredits: () => Promise<UserCredit[]>;
  fetchSubscription: () => Promise<Subscription | null>;
  purchaseCredits: () => Promise<void>;
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
    isPurchasing: false,
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

    purchaseCredits: async () => {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ error: new Error("Sign in before buying credits.") });
        return;
      }

      try {
        set({ isPurchasing: true, error: null });
        await purchaseRevenueCatCredits(user);
        await networkService.syncRevenueCatPurchases();
        const credits = await networkService.fetchCredits();
        set({ credits, isPurchasing: false });
      } catch (error) {
        if (isRevenueCatUserCancellation(error)) {
          set({ isPurchasing: false });
          return;
        }

        set({ error: error as Error, isPurchasing: false });
        throw error;
      }
    },
  };
});
