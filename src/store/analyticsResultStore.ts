import { create } from "zustand";
import { AnalyticsResult } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { useAuthStore } from "./authStore";
import { AnalyticsResultGetRequest, AnalyticsResultPostRequest, AnalyticsResultPutRequest, AnalyticsResultDeleteRequest } from "@/types/api/apiRequest";

interface AnalyticsResultState {
  analyticsResults: AnalyticsResult[];
  selectedAnalyticsResult: AnalyticsResult | null;
  isLoading: boolean;
  error: Error | null;
}

interface AnalyticsResultActions {
  setSelectedAnalyticsResult: (analyticsResult: AnalyticsResult) => Promise<void>;
  fetchAnalyticsResults: (params?: AnalyticsResultGetRequest) => Promise<AnalyticsResult[]>;
  fetchAnalyticsResult: (id: string) => Promise<AnalyticsResult | null>;
  createAnalyticsResult: (data: AnalyticsResultPostRequest) => Promise<AnalyticsResult>;
  updateAnalyticsResult: (data: AnalyticsResultPutRequest) => Promise<AnalyticsResult>;
  deleteAnalyticsResult: (data: AnalyticsResultDeleteRequest) => Promise<void>;
}

export type AnalyticsResultStore = AnalyticsResultState & AnalyticsResultActions;

export const useAnalyticsResultStore = create<AnalyticsResultStore>((set, get) => {
  const getAccessToken = () => useAuthStore.getState().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    analyticsResults: [],
    selectedAnalyticsResult: null,
    isLoading: false,
    error: null,

    setSelectedAnalyticsResult: async (analyticsResult: AnalyticsResult) => {
      set({ selectedAnalyticsResult: analyticsResult });
    },

    fetchAnalyticsResults: async (params) => {
      try {
        set({ isLoading: true, error: null });
        const analyticsResults = await networkService.fetchAnalyticsResults(params);
        set({ analyticsResults, isLoading: false });
        return analyticsResults;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    fetchAnalyticsResult: async (id) => {
      try {
        set({ isLoading: true, error: null });
        const analyticsResults = await networkService.fetchAnalyticsResults({ id });
        const analyticsResult = analyticsResults.length > 0 ? analyticsResults[0] : null;
        set({ isLoading: false });
        return analyticsResult;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    createAnalyticsResult: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const analyticsResult = await networkService.createAnalyticsResult(data);
        set((state) => ({ 
          analyticsResults: [...state.analyticsResults, analyticsResult],
          isLoading: false 
        }));
        return analyticsResult;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    updateAnalyticsResult: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const updatedAnalyticsResult = await networkService.updateAnalyticsResult(data);
        set((state) => ({
          analyticsResults: state.analyticsResults.map(analyticsResult => analyticsResult.id === data.id ? updatedAnalyticsResult : analyticsResult),
          isLoading: false
        }));
        return updatedAnalyticsResult;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    deleteAnalyticsResult: async (data) => {
      try {
        set({ isLoading: true, error: null });
        await networkService.deleteAnalyticsResult(data);
        set((state) => ({
          analyticsResults: state.analyticsResults.filter(analyticsResult => analyticsResult.id !== data.id),
          isLoading: false
        }));
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    }
  };
});