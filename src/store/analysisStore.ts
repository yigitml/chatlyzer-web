import { create } from "zustand";
import { Analysis } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { useAuthStore } from "./authStore";
import { AnalysisGetRequest, AnalysisPostRequest, AnalysisPutRequest, AnalysisDeleteRequest } from "@/types/api/apiRequest";

interface AnalysisState {
  analyzes: Analysis[];
  isLoading: boolean;
  error: Error | null;
}

interface AnalysisActions {
  fetchAnalyzes: (params?: AnalysisGetRequest) => Promise<Analysis[]>;
  fetchAnalysis: (id: string) => Promise<Analysis | null>;
  createAnalysis: (data: AnalysisPostRequest) => Promise<Analysis[]>;
  updateAnalysis: (data: AnalysisPutRequest) => Promise<Analysis>;
  deleteAnalysis: (data: AnalysisDeleteRequest) => Promise<void>;
}

export type AnalysisStore = AnalysisState & AnalysisActions;

export const useAnalysisStore = create<AnalysisStore>((set, get) => {
  const getAccessToken = () => useAuthStore.getState().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    analyzes: [],
    selectedAnalysis: null,
    isLoading: false,
    error: null,

    fetchAnalyzes: async (params) => {
      try {
        set({ isLoading: true, error: null });
        const analyzes = await networkService.fetchAnalyzes(params);
        set({ analyzes, isLoading: false });
        return analyzes;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    fetchAnalysis: async (id) => {
      try {
        set({ isLoading: true, error: null });
        const analyzes = await networkService.fetchAnalyzes({ id });
        const analysis = analyzes.length > 0 ? analyzes[0] : null;
        set({ isLoading: false });
        return analysis;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    createAnalysis: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const analyses = await networkService.createAnalysis(data);
        set((state) => ({ 
          analyzes: [...state.analyzes, ...analyses],
          isLoading: false 
        }));
        return analyses;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    updateAnalysis: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const updatedAnalysis = await networkService.updateAnalysis(data);
        set((state) => ({
          analyzes: state.analyzes.map(analysis => analysis.id === data.id ? updatedAnalysis : analysis),
          isLoading: false
        }));
        return updatedAnalysis;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    deleteAnalysis: async (data) => {
      try {
        set({ isLoading: true, error: null });
        await networkService.deleteAnalysis(data);
        set((state) => ({
          analyzes: state.analyzes.filter(analysis => analysis.id !== data.id),
          isLoading: false
        }));
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    }
  };
});