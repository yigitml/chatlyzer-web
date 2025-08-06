import { useState } from "react";
import { useAnalysisStore } from "@/frontend/store/analysisStore";
import { useCreditStore } from "@/frontend/store/creditStore";
import { AnalysisType, PrivacyAnalysisPostRequest } from "@/shared/types/api/apiRequest";
import { normalizeAnalysisType } from "@/shared/types/analysis";

export const useAnalysisManagement = () => {
  const { 
    analyzes, 
    privacyAnalyzes,
    fetchAnalyzes, 
    createAnalysis,
    createPrivacyAnalysis,
    isLoading,
    isPrivacyLoading
  } = useAnalysisStore();
  const { credits, fetchCredits } = useCreditStore();
  
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(false);

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
      await fetchAnalyzes({ chatId });
      showToast("Analysis complete! The tea has been spilled ☕", "success");
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
    
    // Setters
    setSelectedAnalysisType,
    setIsPrivacyMode: handleTogglePrivacyMode,
    setIsGhostMode: handleToggleGhostMode,
    
    // Actions
    handleAnalyzeChat,
    handlePrivacyAnalysis,
    fetchAnalyzes,
    fetchCredits,
    
    // Computed
    getAnalysesByType,
    totalCredits: credits.reduce((sum, credit) => sum + credit.amount, 0)
  };
}; 