import { create } from "zustand";
import { Analysis, Chat } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { useAuthStore } from "./authStore";
import { 
  AnalysisGetRequest, 
  AnalysisPostRequest, 
  AnalysisPutRequest, 
  AnalysisDeleteRequest,
  PrivacyAnalysisGetRequest,
  PrivacyAnalysisPostRequest
} from "@/types/api/apiRequest";

interface AnalysisState {
  analyzes: Analysis[];
  privacyAnalyzes: Analysis[];
  isLoading: boolean;
  isPrivacyLoading: boolean;
  error: Error | null;
}

interface AnalysisActions {
  fetchAnalyzes: (params?: AnalysisGetRequest) => Promise<Analysis[]>;
  fetchAnalysis: (id: string) => Promise<Analysis | null>;
  createAnalysis: (data: AnalysisPostRequest) => Promise<Analysis[]>;
  updateAnalysis: (data: AnalysisPutRequest) => Promise<Analysis>;
  deleteAnalysis: (data: AnalysisDeleteRequest) => Promise<void>;
  
  // Privacy analysis actions
  fetchPrivacyAnalyzes: (params?: PrivacyAnalysisGetRequest) => Promise<Analysis[]>;
  createPrivacyAnalysis: (data: PrivacyAnalysisPostRequest) => Promise<{ chat: Chat; analyses: Analysis[] }>;
  updatePrivacyAnalysis: (data: AnalysisPutRequest) => Promise<Analysis>;
  deletePrivacyAnalysis: (data: AnalysisDeleteRequest) => Promise<void>;
}

export type AnalysisStore = AnalysisState & AnalysisActions;

export const useAnalysisStore = create<AnalysisStore>((set, get) => {
  const getAccessToken = () => useAuthStore.getState().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    analyzes: [],
    privacyAnalyzes: [],
    isLoading: false,
    isPrivacyLoading: false,
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
    },

    // Privacy analysis methods
    fetchPrivacyAnalyzes: async (params) => {
      try {
        set({ isPrivacyLoading: true, error: null });
        const privacyAnalyzes = await networkService.fetchPrivacyAnalyzes(params);
        set({ privacyAnalyzes, isPrivacyLoading: false });
        return privacyAnalyzes;
      } catch (error) {
        set({ error: error as Error, isPrivacyLoading: false });
        throw error;
      }
    },

    createPrivacyAnalysis: async (data) => {
      try {
        set({ isPrivacyLoading: true, error: null });
        const result = await networkService.createPrivacyAnalysis(data);
        set((state) => ({ 
          privacyAnalyzes: [...state.privacyAnalyzes, ...result.analyses],
          isPrivacyLoading: false 
        }));
        return result;
      } catch (error) {
        set({ error: error as Error, isPrivacyLoading: false });
        throw error;
      }
    },

    updatePrivacyAnalysis: async (data) => {
      try {
        set({ isPrivacyLoading: true, error: null });
        const updatedAnalysis = await networkService.updatePrivacyAnalysis(data);
        set((state) => ({
          privacyAnalyzes: state.privacyAnalyzes.map(analysis => analysis.id === data.id ? updatedAnalysis : analysis),
          isPrivacyLoading: false
        }));
        return updatedAnalysis;
      } catch (error) {
        set({ error: error as Error, isPrivacyLoading: false });
        throw error;
      }
    },

    deletePrivacyAnalysis: async (data) => {
      try {
        set({ isPrivacyLoading: true, error: null });
        await networkService.deletePrivacyAnalysis(data);
        set((state) => ({
          privacyAnalyzes: state.privacyAnalyzes.filter(analysis => analysis.id !== data.id),
          isPrivacyLoading: false
        }));
      } catch (error) {
        set({ error: error as Error, isPrivacyLoading: false });
        throw error;
      }
    }
  };
});