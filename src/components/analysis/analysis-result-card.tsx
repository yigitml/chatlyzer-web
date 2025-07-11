import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisType } from "@/types/api/apiRequest";
import { ANALYSIS_CONFIG, normalizeAnalysisType } from "@/types/analysis";
import {
  VibeCheckAnalysisBuilder,
  RedFlagAnalysisBuilder,
  GreenFlagAnalysisBuilder,
  SimpOMeterAnalysisBuilder,
  GhostRiskAnalysisBuilder,
  MainCharacterEnergyAnalysisBuilder,
  EmotionalDepthAnalysisBuilder,
  ChatStatsAnalysisBuilder
} from "./analysis-builders";

interface AnalysisResultCardProps {
  analysis: any;
}

export const AnalysisResultCard = ({ analysis }: AnalysisResultCardProps) => {
  const getAnalysisType = () => {
    try {
      const result = typeof analysis.result === 'string' 
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
  
  const getAnalysisData = () => {
    try {
      return typeof analysis.result === 'string' 
        ? JSON.parse(analysis.result) 
        : analysis.result;
    } catch {
      return {};
    }
  };
  
  const analysisType = getAnalysisType();
  const analysisData = getAnalysisData();
  const config = ANALYSIS_CONFIG[analysisType as AnalysisType] || { emoji: "🔍", title: "Analysis", description: "" };
  
  const renderAnalysisContent = () => {
    switch (analysisType) {
      case 'VibeCheck':
        return <VibeCheckAnalysisBuilder data={analysisData} />;
      case 'RedFlag':
        return <RedFlagAnalysisBuilder data={analysisData} />;
      case 'GreenFlag':
        return <GreenFlagAnalysisBuilder data={analysisData} />;
      case 'SimpOMeter':
        return <SimpOMeterAnalysisBuilder data={analysisData} />;
      case 'GhostRisk':
        return <GhostRiskAnalysisBuilder data={analysisData} />;
      case 'MainCharacterEnergy':
        return <MainCharacterEnergyAnalysisBuilder data={analysisData} />;
      case 'EmotionalDepth':
        return <EmotionalDepthAnalysisBuilder data={analysisData} />;
      case 'ChatStats':
        return <ChatStatsAnalysisBuilder data={analysisData} />;
      default:
        return (
          <div className="bg-black/20 rounded-lg p-4 border border-white/10">
            <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono overflow-x-auto">
              {JSON.stringify(analysisData, null, 2)}
            </pre>
          </div>
        );
    }
  };
  
  return (
    <Card className="bg-white/5 border-white/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.emoji}</span>
          <div>
            <CardTitle className="text-white text-lg">{config.title}</CardTitle>
            <p className="text-white/60 text-sm">{config.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderAnalysisContent()}
      </CardContent>
    </Card>
  );
}; 