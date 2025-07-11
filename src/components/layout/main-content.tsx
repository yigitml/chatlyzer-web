import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard, SkeletonAnalysisGrid } from "@/components/common/skeleton";
import { AnalysisPreviewCard } from "@/components/analysis/analysis-preview-card";
import { AnalysisResultCard } from "@/components/analysis/analysis-result-card";
import { Plus, Sparkles, Trash2, BarChart3 } from "lucide-react";
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
            Create Your First Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
      {isLoadingChatData ? (
        // Skeleton Loading State
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded w-64 mb-2"></div>
            <div className="h-4 bg-white/15 rounded w-48"></div>
          </div>
          
          <SkeletonAnalysisGrid />
          
          <div className="space-y-4">
            <div className="h-6 bg-white/15 rounded w-32 sm:w-48 animate-pulse"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{selectedChat.title}</h1>
              <p className="text-sm sm:text-base text-white/60">
                {selectedChatMessages.length} messages • {selectedChatAnalyzes.length > 0 ? 'Analysis complete' : 'Ready for analysis'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteChat}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Analysis Types Preview - Now Selectable */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
            {(Object.keys(ANALYSIS_CONFIG) as AnalysisType[]).map(analysisType => (
              <AnalysisPreviewCard
                key={analysisType}
                analysisType={analysisType}
                analysisData={analysesByType[analysisType]}
                isSelected={selectedAnalysisType === analysisType}
                onClick={() => {
                  if (analysesByType[analysisType]) {
                    onSelectAnalysisType(
                      selectedAnalysisType === analysisType ? null : analysisType
                    );
                  }
                }}
              />
            ))}
          </div>

          {/* Analysis Results or Call to Action */}
          {selectedChatAnalyzes.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {selectedAnalysisType ? 
                  `${ANALYSIS_CONFIG[selectedAnalysisType]?.title} Results` : 
                  'Analysis Results'
                }
              </h2>
              
              {selectedAnalysisType ? (
                // Show specific analysis
                analysesByType[selectedAnalysisType] && (
                  <AnalysisResultCard analysis={analysesByType[selectedAnalysisType]} />
                )
              ) : (
                // Show all analyses
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {selectedChatAnalyzes.map(analysis => (
                    <AnalysisResultCard key={analysis.id} analysis={analysis} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card className="bg-white/5 border-white/20">
              <CardContent className="p-12 text-center">
                <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Ready to spill the tea?</h3>
                <p className="text-white/60 mb-6">
                  Run an analysis to get insights on this conversation
                </p>
                <Button
                  onClick={onAnalyzeChat}
                  disabled={isAnalyzing || totalCredits < 8}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="border-2 border-white/20 border-t-white rounded-full animate-spin w-4 h-4" />
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    "Start Analysis"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Messages Preview */}
          {selectedChatMessages.length > 0 && (
            <Card className="bg-white/5 border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Messages Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedChatMessages.slice(0, 5).map(message => (
                    <div key={message.id} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-purple-300">{message.sender}</span>
                        <span className="text-xs text-white/40">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/80">{message.content}</p>
                    </div>
                  ))}
                  {selectedChatMessages.length > 5 && (
                    <p className="text-center text-white/40 text-sm py-2">
                      +{selectedChatMessages.length - 5} more messages
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}; 