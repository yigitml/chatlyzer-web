import { Button } from "@/frontend/components/ui/button";
import {
  SkeletonCard,
  SkeletonAnalysisGrid,
} from "@/frontend/components/common/skeleton";
import { AnalysisResultCard } from "@/frontend/components/analysis/analysis-result-card";
import { BuyCreditsButton } from "@/frontend/components/common/buy-credits-button";
import { Plus, Sparkles, Trash2, BarChart3 } from "lucide-react";
import { AnalysisType } from "@/shared/types/api/apiRequest";
import { ANALYSIS_CONFIG } from "@/shared/types/analysis";
import { Chat } from "../../../generated/client";

interface MainContentProps {
  selectedChat: Chat | undefined;
  selectedChatMessages: any[];
  selectedChatAnalyzes: any[];
  analysesByType: Record<AnalysisType, any>;
  selectedAnalysisType: AnalysisType | null;
  isLoadingChatData: boolean;
  isAnalyzing: boolean;
  totalCredits: number;
  canAnalyze?: boolean;
  hasInProgressAnalysis: boolean;
  hasRecoverableRequest?: boolean;
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
  canAnalyze: fundedAnalysis = totalCredits >= 8,
  hasInProgressAnalysis,
  hasRecoverableRequest = false,
  onAnalyzeChat,
  onDeleteChat,
  onCreateChat,
  onSelectAnalysisType,
}: MainContentProps) => {
  const completed = selectedChatAnalyzes.filter(
    (a) => a.status === "COMPLETED",
  );
  const failures = selectedChatAnalyzes.filter((a) => a.status === "FAILED");
  const hasAnalyses = completed.length > 0;
  const canAnalyze = !selectedChat?.isPrivacy;

  // Filter analyses based on selected type
  const filteredAnalyses = selectedAnalysisType
    ? Object.entries(analysesByType).filter(
        ([type]) => type === selectedAnalysisType,
      )
    : Object.entries(analysesByType);

  if (!selectedChat) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center min-w-0 max-w-md border-2 border-primary bg-card p-4 sm:p-12 shadow-brutal">
          <Sparkles className="w-16 sm:w-20 h-16 sm:h-20 text-muted-foreground mx-auto mb-4 sm:mb-6" />
          <h2 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-widest text-foreground mb-4">
            Select a chat to analyze
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-mono mb-6 sm:mb-8">
            Choose a conversation from the sidebar to get started.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={onCreateChat} className="w-full">
              <Plus className="w-5 h-5 mr-2" />
              Create New Chat
            </Button>
            <BuyCreditsButton className="w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-no-capture ph-mask flex min-w-0 flex-col h-full">
      {/* Header */}
      <div className="border-b-2 border-primary p-4 sm:p-6 bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-lg sm:text-2xl font-bold font-mono tracking-widest uppercase text-foreground truncate">
              {selectedChat.title || "Untitled Chat"}
            </h1>
            {/* Chat info inline with title */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground font-mono uppercase">
              <span>
                {selectedChat.isPrivacy
                  ? "Messages not retained"
                  : `${selectedChatMessages.length} messages`}
              </span>
              <span>
                {Array.isArray(selectedChat.participants)
                  ? selectedChat.participants.length
                  : 0}{" "}
                par.
              </span>
              <span>{selectedChatAnalyzes.length} analyses</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Only show Analyze Chat button when no analyses exist */}
            {!hasAnalyses && canAnalyze && (
              <Button
                onClick={onAnalyzeChat}
                disabled={
                  isAnalyzing ||
                  hasInProgressAnalysis ||
                  (canAnalyze && !fundedAnalysis && !hasRecoverableRequest)
                }
              >
                {isAnalyzing || hasInProgressAnalysis ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    {hasInProgressAnalysis ? "Processing..." : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {hasRecoverableRequest
                      ? "Check existing analysis"
                      : "Analyze Chat (8)"}
                  </>
                )}
              </Button>
            )}

            <Button
              variant="destructive"
              size="icon"
              aria-label="Delete selected chat"
              onClick={onDeleteChat}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  <Button
                    variant={
                      selectedAnalysisType === null ? "default" : "outline"
                    }
                    size="default"
                    onClick={() => onSelectAnalysisType(null)}
                    className="w-full text-sm font-medium"
                  >
                    All
                  </Button>
                  {Object.entries(ANALYSIS_CONFIG).map(([type, config]) => {
                    const hasThisAnalysis =
                      analysesByType[type as AnalysisType];
                    if (!hasThisAnalysis) return null;

                    return (
                      <Button
                        key={type}
                        variant={
                          selectedAnalysisType === type ? "default" : "outline"
                        }
                        size="default"
                        onClick={() =>
                          onSelectAnalysisType(
                            selectedAnalysisType === type
                              ? null
                              : (type as AnalysisType),
                          )
                        }
                        className="w-full text-sm font-medium flex items-center gap-2"
                      >
                        <span>{config.emoji}</span>
                        <span>{config.title}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Analysis Results Grid - Responsive based on count */}
                <div
                  className={`grid gap-4 ${
                    filteredAnalyses.length === 1
                      ? "grid-cols-1"
                      : "grid-cols-1 md:grid-cols-2"
                  }`}
                >
                  {filteredAnalyses.map(([type, analysis]) => (
                    <AnalysisResultCard key={type} analysis={analysis} />
                  ))}
                </div>

                {filteredAnalyses.length === 0 && !selectedAnalysisType && (
                  <p role="status">
                    Saved results could not be displayed. Contact support for
                    help.
                  </p>
                )}
                {filteredAnalyses.length === 0 && selectedAnalysisType && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground font-mono uppercase tracking-widest border-2 border-primary bg-background p-4 shadow-brutal-sm">
                      No results for{" "}
                      {ANALYSIS_CONFIG[selectedAnalysisType]?.title}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* No Analyses State */}
            {!hasAnalyses && (
              <div className="text-center py-8 sm:py-16 border-2 border-primary bg-card shadow-brutal mt-4 p-3 sm:p-8">
                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-xl font-bold font-mono tracking-widest uppercase text-foreground mb-4">
                  {hasInProgressAnalysis
                    ? "Analysis in Progress"
                    : failures.length
                      ? "Analysis Failed"
                      : "No Analysis Yet"}
                </h3>
                <p className="text-muted-foreground font-mono text-sm mb-8">
                  {hasInProgressAnalysis
                    ? "Your analysis is being processed. This may take a few moments..."
                    : failures.length
                      ? "The analysis did not complete. You can retry. If the response was lost, checking the same request avoids a duplicate charge."
                      : "Analyze this chat to see insights"}
                </p>
                {failures.length > 0 && (
                  <p role="alert" className="mb-4 text-destructive break-words">
                    {Array.from(
                      new Set(failures.map((a) => a.error).filter(Boolean)),
                    ).join(" ") || "Analysis failed."}
                  </p>
                )}
                {canAnalyze &&
                  !fundedAnalysis &&
                  totalCredits >= 8 &&
                  !hasRecoverableRequest && (
                    <p role="status" className="mb-4 text-sm">
                      An analysis needs 8 credits in a single paid or test pool.
                      The two pools cannot be combined.
                    </p>
                  )}
                <Button
                  onClick={canAnalyze ? onAnalyzeChat : onCreateChat}
                  disabled={
                    isAnalyzing ||
                    hasInProgressAnalysis ||
                    (canAnalyze && !fundedAnalysis && !hasRecoverableRequest)
                  }
                >
                  {isAnalyzing || hasInProgressAnalysis ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      {hasInProgressAnalysis ? "Processing..." : "Analyzing..."}
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {canAnalyze
                        ? hasRecoverableRequest
                          ? "Check existing analysis"
                          : failures.length
                            ? "Retry Analysis (8 credits)"
                            : "Start Analysis (8 credits)"
                        : "Import messages again"}
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
