import {
  assertCurrentSession,
  registerAccountReset,
  sessionGeneration,
} from "./sessionScope";
import { create } from "zustand";
import { Analysis, Chat, AnalysisStatus } from "../../generated/client";
import { createNetworkService } from "@/shared/utils/network";
import { useAuthStore } from "./authStore";
import {
  AnalysisGetRequest,
  AnalysisPostRequest,
  AnalysisPutRequest,
  AnalysisDeleteRequest,
  PrivacyAnalysisPostRequest,
} from "@/shared/types/api/apiRequest";

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

  // Status checking actions
  checkAnalysisStatus: (chatId: string) => Promise<Analysis[]>;
  hasInProgressAnalysis: (chatId: string) => boolean;

  // Privacy analysis actions
  createPrivacyAnalysis: (data: PrivacyAnalysisPostRequest) => Promise<{
    chat: Chat | null;
    analyses: Analysis[];
    job?: { id: string; status: string };
  }>;
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
      const generation = sessionGeneration();
      try {
        set({ isLoading: true, error: null });
        const analyzes = await networkService.fetchAnalyzes(params);
        assertCurrentSession(generation);
        set({ analyzes, isLoading: false });
        return analyzes;
      } catch (error) {
        assertCurrentSession(generation);
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    fetchAnalysis: async (id) => {
      const generation = sessionGeneration();
      try {
        set({ isLoading: true, error: null });
        const analysis = await networkService.fetchAnalysis(id);
        assertCurrentSession(generation);
        set({ isLoading: false });
        return analysis;
      } catch (error) {
        assertCurrentSession(generation);
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    createAnalysis: async (data) => {
      const generation = sessionGeneration();
      try {
        set({ isLoading: true, error: null });
        const analyses = await networkService.createAnalysis(data);
        assertCurrentSession(generation);
        set((state) => ({
          analyzes: [
            ...state.analyzes.filter(
              (a) => !analyses.some((n) => n.id === a.id),
            ),
            ...analyses,
          ],
          isLoading: false,
        }));
        return analyses;
      } catch (error) {
        assertCurrentSession(generation);
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    updateAnalysis: async (data) => {
      const generation = sessionGeneration();
      try {
        set({ isLoading: true, error: null });
        const updatedAnalysis = await networkService.updateAnalysis(data);
        assertCurrentSession(generation);
        set((state) => ({
          analyzes: state.analyzes.map((analysis) =>
            analysis.id === data.id ? updatedAnalysis : analysis,
          ),
          isLoading: false,
        }));
        return updatedAnalysis;
      } catch (error) {
        assertCurrentSession(generation);
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    deleteAnalysis: async (data) => {
      const generation = sessionGeneration();
      try {
        set({ isLoading: true, error: null });
        await networkService.deleteAnalysis(data);
        assertCurrentSession(generation);
        set((state) => ({
          analyzes: state.analyzes.filter(
            (analysis) => analysis.id !== data.id,
          ),
          isLoading: false,
        }));
      } catch (error) {
        assertCurrentSession(generation);
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    // Status checking methods
    checkAnalysisStatus: async (chatId) => {
      const generation = sessionGeneration();
      try {
        const auth = useAuthStore.getState();
        if (!auth.isAuthenticated) {
          return [];
        }
        const analyses = await networkService.fetchAnalyzes({
          chatId,
          includeInProgress: true,
        });
        assertCurrentSession(generation);
        // Update store with all analyses including in-progress ones
        set((state) => {
          const otherAnalyses = state.analyzes.filter(
            (a) => a.chatId !== chatId,
          );
          return { analyzes: [...otherAnalyses, ...analyses] };
        });
        return analyses;
      } catch (error) {
        assertCurrentSession(generation);
        console.error("Failed to check analysis status:", error);
        throw error;
      }
    },

    hasInProgressAnalysis: (chatId) => {
      const state = get();
      const chatAnalyses = state.analyzes.filter((a) => a.chatId === chatId);
      return chatAnalyses.some(
        (a) =>
          a.status === AnalysisStatus.PENDING ||
          a.status === AnalysisStatus.PROCESSING,
      );
    },

    // Privacy analysis methods

    createPrivacyAnalysis: async (data) => {
      const generation = sessionGeneration();
      try {
        set({ isPrivacyLoading: true, error: null });
        const result = await networkService.createPrivacyAnalysis(data);
        assertCurrentSession(generation);
        set((state) => ({
          analyzes: data.isGhostMode
            ? state.analyzes
            : [
                ...state.analyzes.filter(
                  (a) => !result.analyses.some((n) => n.id === a.id),
                ),
                ...result.analyses,
              ],
          isPrivacyLoading: false,
        }));
        return result;
      } catch (error) {
        assertCurrentSession(generation);
        set({ error: error as Error, isPrivacyLoading: false });
        throw error;
      }
    },
  };
});

registerAccountReset(() =>
  useAnalysisStore.setState({
    analyzes: [],
    privacyAnalyzes: [],
    isLoading: false,
    isPrivacyLoading: false,
    error: null,
  }),
);
