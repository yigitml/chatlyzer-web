import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { AnalysisType } from "@/shared/types/api/apiRequest";
import {
  ANALYSIS_CONFIG,
  normalizeAnalysisType,
} from "@/shared/types/analysis";
import {
  VibeCheckAnalysisBuilder,
  RedFlagAnalysisBuilder,
  GreenFlagAnalysisBuilder,
  SimpOMeterAnalysisBuilder,
  GhostRiskAnalysisBuilder,
  MainCharacterEnergyAnalysisBuilder,
  EmotionalDepthAnalysisBuilder,
  ChatStatsAnalysisBuilder,
} from "./analysis-builders";
import {
  ChatlyzerSchemas,
  type AnalysisResult,
} from "@/shared/schemas/zodSchemas";
import { ErrorBoundary } from "react-error-boundary";

interface AnalysisResultCardProps {
  analysis: {
    result: string | AnalysisResult | unknown;
  };
}

export const AnalysisResultCard = ({ analysis }: AnalysisResultCardProps) => {
  const getAnalysisType = () => {
    try {
      const result =
        typeof analysis.result === "string"
          ? JSON.parse(analysis.result)
          : analysis.result;
      const rawType = result?.type || result?.analysisType;
      if (rawType) {
        return normalizeAnalysisType(rawType) || "Unknown";
      }
      return "Unknown";
    } catch {
      return "Unknown";
    }
  };

  const getAnalysisData = (): AnalysisResult | Record<string, unknown> => {
    try {
      const parsed =
        typeof analysis.result === "string"
          ? JSON.parse(analysis.result)
          : (analysis.result ?? {});
      return parsed && typeof parsed === "object"
        ? (parsed as AnalysisResult | Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };

  const analysisType = getAnalysisType();
  const analysisData = getAnalysisData();
  const config = ANALYSIS_CONFIG[analysisType as AnalysisType] || {
    emoji: "🔍",
    title: "Analysis",
    description: "",
  };

  const schemaTypes: Record<string, string> = {
    ChatStats: "chat_stats",
    RedFlag: "red_flag",
    GreenFlag: "green_flag",
    VibeCheck: "vibe_check",
    SimpOMeter: "simp_o_meter",
    GhostRisk: "ghost_risk",
    MainCharacterEnergy: "main_character_energy",
    EmotionalDepth: "emotional_depth",
  };
  const schema =
    ChatlyzerSchemas[analysisType as keyof typeof ChatlyzerSchemas];
  const valid = schema
    ? schema.safeParse({ ...analysisData, type: schemaTypes[analysisType] })
        .success
    : false;
  const sampling =
    "sampling" in analysisData &&
    analysisData.sampling &&
    typeof analysisData.sampling === "object"
      ? (analysisData.sampling as {
          totalMessages?: number;
          sampledMessages?: number;
          qualitativeSampled?: boolean;
        })
      : null;
  const renderAnalysisContent = () => {
    if (!valid)
      return (
        <p role="status">
          This saved result has an unsupported format. Contact support for help.
        </p>
      );
    switch (analysisType) {
      case "VibeCheck":
        return <VibeCheckAnalysisBuilder data={analysisData} />;
      case "RedFlag":
        return <RedFlagAnalysisBuilder data={analysisData} />;
      case "GreenFlag":
        return <GreenFlagAnalysisBuilder data={analysisData} />;
      case "SimpOMeter":
        return <SimpOMeterAnalysisBuilder data={analysisData} />;
      case "GhostRisk":
        return <GhostRiskAnalysisBuilder data={analysisData} />;
      case "MainCharacterEnergy":
        return <MainCharacterEnergyAnalysisBuilder data={analysisData} />;
      case "EmotionalDepth":
        return <EmotionalDepthAnalysisBuilder data={analysisData} />;
      case "ChatStats":
        return <ChatStatsAnalysisBuilder data={analysisData} />;
      default:
        return (
          <div className="bg-background border-2 border-primary rounded-none p-4 shadow-brutal-sm">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-mono overflow-x-auto">
              {JSON.stringify(analysisData, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <Card className="ph-no-capture ph-mask min-w-0 break-words">
      <CardHeader className="pb-3 border-b-2 border-primary">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.emoji}</span>
          <div>
            <CardTitle className="text-card-foreground font-mono uppercase tracking-widest text-lg">
              {config.title}
            </CardTitle>
            <p className="text-muted-foreground font-mono uppercase text-sm mt-1">
              {config.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sampling?.qualitativeSampled && (
          <p className="text-sm text-muted-foreground mb-4">
            Qualitative insights use {sampling.sampledMessages} of{" "}
            {sampling.totalMessages} messages. Conversation statistics cover all
            messages; dates and response times use UTC, and the current streak
            ends on the latest message day.
          </p>
        )}
        <ErrorBoundary
          fallback={
            <p role="status">This saved result could not be displayed.</p>
          }
        >
          {renderAnalysisContent()}
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
};
