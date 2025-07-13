import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard, SkeletonAnalysisGrid } from "@/components/common/skeleton";
import { AnalysisResultCard } from "@/components/analysis/analysis-result-card";
import { Plus, Sparkles, Trash2, BarChart3, MessageCircle } from "lucide-react";
import { AnalysisType } from "@/types/api/apiRequest";
import { ANALYSIS_CONFIG } from "@/types/analysis";
import { Chat } from "@prisma/client";

interface MainContentProps {
  selectedChat: Chat | undefined;
  selectedChatMessages: any[];
  selectedChatAnalyzes: any[];
  analysesByType: Record<AnalysisType, any>;
  selectedAnalysisType: AnalysisType | null;
  isLoadingChatData: boolean;
  isAnalyzing: boolean;
  totalCredits: number;
  onAnalyzeChat: () => void;
  onDeleteChat: () => void;
  onCreateChat: () => void;
  onSelectAnalysisType: (type: AnalysisType | null) => void;
}

export const MainContent = ({
  selectedChat,
  selectedChatMessages,
  selectedChatAnalyzes,
  analysesByType,
  selectedAnalysisType,
  isLoadingChatData,
  isAnalyzing,
  totalCredits,
  onAnalyzeChat,
  onDeleteChat,
  onCreateChat,
  onSelectAnalysisType
}: MainContentProps) => {
  const hasAnalyses = selectedChatAnalyzes.length > 0;
  
  // Filter analyses based on selected type
  const filteredAnalyses = selectedAnalysisType 
    ? Object.entries(analysesByType).filter(([type]) => type === selectedAnalysisType)
    : Object.entries(analysesByType);

  if (!selectedChat) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center max-w-md">
          <Sparkles className="w-16 sm:w-20 h-16 sm:h-20 text-white/20 mx-auto mb-4 sm:mb-6" />
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Select a chat to analyze</h2>
          <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">Choose a conversation from the sidebar to get started</p>
          <Button
            onClick={onCreateChat}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
              {selectedChat.title || "Untitled Chat"}
            </h1>
            {/* Chat info inline with title */}
            <div className="flex items-center gap-4 text-sm text-white/60">
              <span>{selectedChatMessages.length} messages</span>
              <span>{Array.isArray(selectedChat.participants) ? selectedChat.participants.length : 0} participants</span>
              <span>{selectedChatAnalyzes.length} analyses</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Only show Analyze Chat button when no analyses exist */}
            {!hasAnalyses && (
              <Button
                onClick={onAnalyzeChat}
                disabled={isAnalyzing || totalCredits < 8}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analyze Chat (8)
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteChat}
              className="text-red-400 hover:text-red-300 border-red-400/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoadingChatData ? (
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonAnalysisGrid />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Analysis Results */}
            {hasAnalyses && (
              <div className="space-y-4">
                {/* Analysis Type Toggles - Fill Width */}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                  <Button
                    variant={selectedAnalysisType === null ? "default" : "outline"}
                    size="default"
                    onClick={() => onSelectAnalysisType(null)}
                    className="w-full text-sm font-medium"
                  >
                    All
                  </Button>
                  {Object.entries(ANALYSIS_CONFIG).map(([type, config]) => {
                    const hasThisAnalysis = analysesByType[type as AnalysisType];
                    if (!hasThisAnalysis) return null;
                    
                    return (
                      <Button
                        key={type}
                        variant={selectedAnalysisType === type ? "default" : "outline"}
                        size="default"
                        onClick={() => onSelectAnalysisType(
                          selectedAnalysisType === type ? null : type as AnalysisType
                        )}
                        className="w-full text-sm font-medium flex items-center gap-2"
                      >
                        <span>{config.emoji}</span>
                        <span>{config.title}</span>
                      </Button>
                    );
                  })}
                </div>
                
                {/* Analysis Results Grid - Responsive based on count */}
                <div className={`grid gap-4 ${
                  filteredAnalyses.length === 1 
                    ? 'grid-cols-1' 
                    : 'grid-cols-1 md:grid-cols-2'
                }`}>
                  {filteredAnalyses.map(([type, analysis]) => (
                    <AnalysisResultCard
                      key={type}
                      analysis={analysis}
                    />
                  ))}
                </div>
                
                {filteredAnalyses.length === 0 && selectedAnalysisType && (
                  <div className="text-center py-8">
                    <p className="text-white/60">No results for {ANALYSIS_CONFIG[selectedAnalysisType]?.title}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* No Analyses State */}
            {!hasAnalyses && (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Analysis Yet</h3>
                <p className="text-white/60 mb-6">Analyze this chat to see insights</p>
                <Button
                  onClick={onAnalyzeChat}
                  disabled={isAnalyzing || totalCredits < 8}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Start Analysis (8 credits)
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 