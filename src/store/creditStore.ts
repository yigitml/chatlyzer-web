import { create } from "zustand";
import { UserCredit, Subscription } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
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
