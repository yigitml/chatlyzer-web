import { useState, useEffect, useRef } from "react";
import { useAnalysisStore } from "@/frontend/store/analysisStore";
import { useCreditStore } from "@/frontend/store/creditStore";
import { useAuthStore } from "@/frontend/store/authStore";
import { AnalysisType, PrivacyAnalysisPostRequest } from "@/shared/types/api/apiRequest";
import { normalizeAnalysisType } from "@/shared/types/analysis";
import type { Chat, Analysis } from "@prisma/client";

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
    isPrivacyLoading
  } = useAnalysisStore();
  const { credits, fetchCredits } = useCreditStore();
  
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [pollingChatId, setPollingChatId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Ghost results modal state
  const [ghostResult, setGhostResult] = useState<{ chat: Chat; analyses: Analysis[] } | null>(null);
  const [isGhostResultsOpen, setIsGhostResultsOpen] = useState(false);

  // Optimistic credit update
  const updateCreditsOptimistically = async (creditsUsed: number) => {
    setTimeout(async () => {
      try {
        await fetchCredits();
      } catch (error) {
        console.error("Failed to refetch credits:", error);
      }
    }, 2000);
  };

  const handleAnalyzeChat = async (
    chatId: string, 
    showToast: (message: string, type: "success" | "error") => void
  ) => {
    if (!chatId) return;
    
    const totalCredits = credits.reduce((sum, credit) => sum + credit.amount, 0);
    
    if (totalCredits < 8) {
      showToast("Insufficient credits for analysis", "error");
      return;
    }
    
    try {
      updateCreditsOptimistically(8);
      await createAnalysis({ chatId });
      
      // Start polling for analysis completion
      startPolling(chatId);
      
      showToast("Analysis started! We'll update you when it's complete ⏳", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Analysis failed", "error");
      await fetchCredits();
    }
  };

  const handlePrivacyAnalysis = async (
    data: PrivacyAnalysisPostRequest,
    showToast: (message: string, type: "success" | "error") => void
  ) => {
    const totalCredits = credits.reduce((sum, credit) => sum + credit.amount, 0);
    
    if (totalCredits < 8) {
      showToast("Insufficient credits for privacy analysis", "error");
      return;
    }
    
    try {
      updateCreditsOptimistically(8);
      const result = await createPrivacyAnalysis(data);
      
      if (data.isGhostMode) {
        showToast("Ghost analysis complete! No data was saved 👻", "success");
        // Show results in a modal
        setGhostResult(result);
        setIsGhostResultsOpen(true);
      } else {
        showToast("Privacy analysis complete! Messages analyzed but not stored 🔒", "success");
      }
      
      return result;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Privacy analysis failed", "error");
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
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const auth = useAuthStore.getState();
        if (!auth.isAuthenticated || !auth.accessToken) {
          stopPolling();
          return;
        }
        const analyses = await checkAnalysisStatus(chatId);
        const hasInProgress = analyses.some(a => 
          a.status === 'PENDING' || a.status === 'PROCESSING'
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
    }, 3000); // Poll every 3 seconds
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
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Group analyses by type
  const getAnalysesByType = (chatId: string, isPrivacy: boolean = false) => {
    const relevantAnalyzes = isPrivacy ? privacyAnalyzes : analyzes;
    const chatAnalyzes = relevantAnalyzes.filter(analysis => analysis.chatId === chatId);
    
    return chatAnalyzes.reduce((acc, analysis) => {
      try {
        const result = typeof analysis.result === 'string' 
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
    }, {} as Record<AnalysisType, any>);
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
    closeGhostResults: () => setIsGhostResultsOpen(false),
    
    // Actions
    handleAnalyzeChat,
    handlePrivacyAnalysis,
    fetchAnalyzes,
    fetchCredits,
    checkAnalysisStatus,
    hasInProgressAnalysis,
    startPolling,
    stopPolling,
    
    // Computed
    getAnalysesByType,
    totalCredits: credits.reduce((sum, credit) => sum + credit.amount, 0)
  };
}; 