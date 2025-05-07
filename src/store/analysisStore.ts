import { create } from "zustand";
import { Analysis } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { useAuthStore } from "./authStore";
import { AnalysisGetRequest, AnalysisPostRequest, AnalysisPutRequest, AnalysisDeleteRequest } from "@/types/api/apiRequest";

interface AnalysisState {
  analyses: Analysis[];
  selectedAnalysis: Analysis | null;
  isLoading: boolean;
  error: Error | null;
}

interface AnalysisActions {
  setSelectedAnalysis: (analysis: Analysis) => Promise<void>;
  fetchAnalyses: (params?: AnalysisGetRequest) => Promise<Analysis[]>;
  fetchAnalysis: (id: string) => Promise<Analysis | null>;
  createAnalysis: (data: AnalysisPostRequest) => Promise<Analysis>;
  updateAnalysis: (data: AnalysisPutRequest) => Promise<Analysis>;
  deleteAnalysis: (data: AnalysisDeleteRequest) => Promise<void>;
}

export type AnalysisStore = AnalysisState & AnalysisActions;

export const useAnalysisStore = create<AnalysisStore>((set, get) => {
  const getAccessToken = () => useAuthStore.getState().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    analyses: [],
    selectedAnalysis: null,
    isLoading: false,
    error: null,

    setSelectedAnalysis: async (analysis: Analysis) => {
      set({ selectedAnalysis: analysis });
    },

    fetchAnalyses: async (params) => {
      try {
        set({ isLoading: true, error: null });
        const analyses = await networkService.fetchAnalyses(params);
        set({ analyses, isLoading: false });
        return analyses;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    fetchAnalysis: async (id) => {
      try {
        set({ isLoading: true, error: null });
        const analyses = await networkService.fetchAnalyses({ id });
        const analysis = analyses.length > 0 ? analyses[0] : null;
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
        const analysis = await networkService.createAnalysis(data);
        set((state) => ({ 
          analyses: [...state.analyses, analysis],
          isLoading: false 
        }));
        return analysis;
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
          analyses: state.analyses.map(analysis => analysis.id === data.id ? updatedAnalysis : analysis),
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
          analyses: state.analyses.filter(analysis => analysis.id !== data.id),
          isLoading: false
        }));
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    }
  };
});