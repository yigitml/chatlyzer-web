import {
  availableCredits,
  canFundAnalysis,
  sandboxBilling,
} from "@/frontend/lib/creditBalance";
import {
  assertCurrentSession,
  sessionGeneration,
} from "@/frontend/store/sessionScope";
import { useState, useEffect, useRef } from "react";
import { useAnalysisStore } from "@/frontend/store/analysisStore";
import { useCreditStore } from "@/frontend/store/creditStore";
import { useAuthStore } from "@/frontend/store/authStore";
import {
  AnalysisType,
  PrivacyAnalysisPostRequest,
} from "@/shared/types/api/apiRequest";
import { normalizeAnalysisType } from "@/shared/types/analysis";
import type { Chat, Analysis } from "../../generated/client";

export const useAnalysisManagement = () => {
  const {
    analyzes,
    privacyAnalyzes,
    fetchAnalyzes,
    createAnalysis,
    createPrivacyAnalysis,
    checkAnalysisStatus,
    hasInProgressAnalysis,
    isLoading,
    isPrivacyLoading,
  } = useAnalysisStore();
  const { credits, fetchCredits } = useCreditStore();

  const [selectedAnalysisType, setSelectedAnalysisType] =
    useState<AnalysisType | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [, setPollingChatId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Ghost results modal state
  const [ghostResult, setGhostResult] = useState<{
    chat: Chat;
    analyses: Analysis[];
  } | null>(null);
  const [isGhostResultsOpen, setIsGhostResultsOpen] = useState(false);

  const creditTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canRecoverPrivacyRequest, setCanRecoverPrivacyRequest] =
    useState(false);
  const privacyRequestRef = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );
  const [recoverableChatIds, setRecoverableChatIds] = useState<string[]>([]);
  const analysisKeysRef = useRef(new Map<string, string>());

  // Refresh balance after a request starts without allowing an obsolete timer to run.
  // Optimistic credit update
  const updateCreditsOptimistically = async () => {
    const generation = sessionGeneration();
    if (creditTimerRef.current) clearTimeout(creditTimerRef.current);
    creditTimerRef.current = setTimeout(async () => {
      try {
        assertCurrentSession(generation);
        await fetchCredits();
      } catch (error) {
        console.error("Failed to refetch credits:", error);
      }
    }, 2000);
  };

  const handleAnalyzeChat = async (
    chatId: string,
    showToast: (message: string, type: "success" | "error") => void,
  ) => {
    if (!chatId) return;

    if (!canFundAnalysis(credits) && !analysisKeysRef.current.has(chatId)) {
      showToast("Insufficient credits for analysis", "error");
      return;
    }

    const generation = sessionGeneration();
    try {
      updateCreditsOptimistically();
      const requestKey =
        analysisKeysRef.current.get(chatId) || crypto.randomUUID();
      analysisKeysRef.current.set(chatId, requestKey);
      setRecoverableChatIds((ids) => [...new Set([...ids, chatId])]);
      const result = await createAnalysis({ chatId, requestKey });
      assertCurrentSession(generation);
      if (
        !result.some((a) => a.status === "PROCESSING" || a.status === "PENDING")
      ) {
        analysisKeysRef.current.delete(chatId);
        setRecoverableChatIds((ids) => ids.filter((id) => id !== chatId));
      }

      // Start polling for analysis completion
      startPolling(chatId);

      showToast(
        result.some((a) => a.status === "PROCESSING" || a.status === "PENDING")
          ? "Analysis is processing. Results will update automatically."
          : "Analysis complete.",
        "success",
      );
    } catch (error) {
      if (generation !== sessionGeneration()) return;
      if ((error as { status?: number }).status === 409) {
        analysisKeysRef.current.delete(chatId);
        setRecoverableChatIds((ids) => ids.filter((id) => id !== chatId));
      }
      showToast(
        error instanceof Error ? error.message : "Analysis failed",
        "error",
      );
      try {
        const status = await checkAnalysisStatus(chatId);
        assertCurrentSession(generation);
        const pending = status.some(
          (a) => a.status === "PROCESSING" || a.status === "PENDING",
        );
        if (pending) startPolling(chatId);
        else if (status.length) {
          analysisKeysRef.current.delete(chatId);
          setRecoverableChatIds((ids) => ids.filter((id) => id !== chatId));
        }
        await fetchCredits();
      } catch {
        /* retain the key when recovery is unavailable */
      }
    }
  };

  const handlePrivacyAnalysis = async (
    data: PrivacyAnalysisPostRequest,
    showToast: (message: string, type: "success" | "error") => void,
  ) => {
    const fingerprint = JSON.stringify(data);
    const isExistingRequest =
      privacyRequestRef.current?.fingerprint === fingerprint;
    if (!canFundAnalysis(credits) && !isExistingRequest) {
      showToast("Insufficient credits for privacy analysis", "error");
      return;
    }

    const generation = sessionGeneration();
    try {
      updateCreditsOptimistically();
      if (privacyRequestRef.current?.fingerprint !== fingerprint)
        privacyRequestRef.current = { fingerprint, key: crypto.randomUUID() };
      setCanRecoverPrivacyRequest(true);
      const result = await createPrivacyAnalysis({
        ...data,
        requestKey: privacyRequestRef.current.key,
      });
      assertCurrentSession(generation);
      if (!result.chat || result.analyses.length === 0) {
        showToast(
          "Analysis is still processing. Keep this draft open and check again shortly.",
          "success",
        );
        return;
      }
      privacyRequestRef.current = null;
      setCanRecoverPrivacyRequest(false);
      const completed = { chat: result.chat, analyses: result.analyses };

      if (data.isGhostMode) {
        showToast(
          "Ghost analysis complete. Chat content and results were not saved.",
          "success",
        );
        // Show results in a modal
        setGhostResult(completed);
        setIsGhostResultsOpen(true);
      } else {
        showToast(
          "Privacy analysis complete! Messages analyzed but not stored 🔒",
          "success",
        );
      }

      return completed;
    } catch (error) {
      if (generation !== sessionGeneration()) throw error;
      const status = (error as { status?: number }).status || 0;
      if (status >= 400 && status < 500) {
        privacyRequestRef.current = null;
        setCanRecoverPrivacyRequest(false);
      }
      showToast(
        error instanceof Error ? error.message : "Privacy analysis failed",
        "error",
      );
      await fetchCredits();
      throw error;
    }
  };

  // Handle ghost mode toggle - when enabling ghost mode, enable privacy mode too
  const handleToggleGhostMode = (enabled: boolean) => {
    setIsGhostMode(enabled);
    if (enabled && !isPrivacyMode) {
      setIsPrivacyMode(true);
    }
  };

  // Handle privacy mode toggle - when disabling privacy mode, disable ghost mode too
  const handleTogglePrivacyMode = (enabled: boolean) => {
    setIsPrivacyMode(enabled);
    if (!enabled && isGhostMode) {
      setIsGhostMode(false);
    }
  };

  // Polling for in-progress analyses
  const startPolling = (chatId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setPollingChatId(chatId);

    const startTime = Date.now();
    const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    pollingIntervalRef.current = setInterval(async () => {
      // Stop polling if we exceed the timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        stopPolling();
        console.error("Analysis polling timed out after 10 minutes");
        return;
      }

      try {
        const auth = useAuthStore.getState();
        if (!auth.isAuthenticated) {
          stopPolling();
          return;
        }
        const analyses = await checkAnalysisStatus(chatId);
        const hasInProgress = analyses.some(
          (a) => a.status === "PENDING" || a.status === "PROCESSING",
        );

        if (!hasInProgress) {
          // All analyses are completed or failed, stop polling
          stopPolling();
          // Refresh credits since analysis is complete
          await fetchCredits();
        }
      } catch (error) {
        console.error("Polling error:", error);
        // Continue polling even on error, but stop after too many failures
      }
    }, 5000); // Poll every 5 seconds
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setPollingChatId(null);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (creditTimerRef.current) clearTimeout(creditTimerRef.current);
    };
  }, []);

  // Group analyses by type
  const getAnalysesByType = (chatId: string, isPrivacy: boolean = false) => {
    const relevantAnalyzes = analyzes;
    void isPrivacy;
    const chatAnalyzes = relevantAnalyzes.filter(
      (analysis) =>
        analysis.chatId === chatId && analysis.status === "COMPLETED",
    );

    return chatAnalyzes.reduce(
      (acc, analysis) => {
        try {
          const result =
            typeof analysis.result === "string"
              ? JSON.parse(analysis.result)
              : analysis.result;
          const rawType = result?.type || result?.analysisType;
          if (rawType) {
            const normalizedType = normalizeAnalysisType(rawType);
            if (normalizedType) {
              acc[normalizedType] = analysis;
            }
          }
        } catch {
          // Skip invalid analysis results
        }
        return acc;
      },
      {} as Record<AnalysisType, any>,
    );
  };

  return {
    // State
    analyzes,
    privacyAnalyzes,
    isAnalyzing: isLoading || isPrivacyLoading,
    selectedAnalysisType,
    credits,
    isPrivacyMode,
    isGhostMode,
    ghostResult,
    isGhostResultsOpen,

    // Setters
    setSelectedAnalysisType,
    setIsPrivacyMode: handleTogglePrivacyMode,
    setIsGhostMode: handleToggleGhostMode,
    closeGhostResults: () => {
      setIsGhostResultsOpen(false);
      setGhostResult(null);
    },

    // Actions
    handleAnalyzeChat,
    handlePrivacyAnalysis,
    fetchAnalyzes,
    fetchCredits,
    checkAnalysisStatus,
    hasInProgressAnalysis,
    startPolling,
    stopPolling,

    canRecoverPrivacyRequest,
    hasRecoverableAnalysisRequest: (chatId: string) =>
      recoverableChatIds.includes(chatId),
    discardPrivacyDraft: () => {
      privacyRequestRef.current = null;
      setCanRecoverPrivacyRequest(false);
    },
    // Computed
    getAnalysesByType,
    canAnalyze: canFundAnalysis(credits),
    isSandboxBilling: sandboxBilling(credits),
    totalCredits: availableCredits(credits),
  };
};
