import { useState } from "react";
import { useAnalysisStore } from "@/store/analysisStore";
import { useCreditStore } from "@/store/creditStore";
import { AnalysisType } from "@/types/api/apiRequest";
import { normalizeAnalysisType } from "@/types/analysis";

export const useAnalysisManagement = () => {
  const { analyzes, fetchAnalyzes, createAnalysis } = useAnalysisStore();
  const { credits, fetchCredits } = useCreditStore();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType | null>(null);

  // Optimistic credit update
  const updateCreditsOptimistically = async (creditsUsed: number) => {
    // Optimistic update would go here if we had a setter
    // For now, we'll refetch after a delay
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
      setIsAnalyzing(true);
      updateCreditsOptimistically(8); // Optimistic update
      await createAnalysis({ chatId });
      await fetchAnalyzes({ chatId });
      showToast("Analysis complete! The tea has been spilled ☕", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Analysis failed", "error");
      // Refetch credits on error to get correct amount
      await fetchCredits();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Group analyses by type
  const getAnalysesByType = (chatId: string) => {
    const chatAnalyzes = analyzes.filter(analysis => analysis.chatId === chatId);
    
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
    isAnalyzing,
    selectedAnalysisType,
    credits,
    
    // Setters
    setSelectedAnalysisType,
    
    // Actions
    handleAnalyzeChat,
    fetchAnalyzes,
    fetchCredits,
    
    // Computed
    getAnalysesByType,
    totalCredits: credits.reduce((sum, credit) => sum + credit.amount, 0)
  };
}; 