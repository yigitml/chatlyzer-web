import { AnalysisType } from "@/types/api/apiRequest";
import { ANALYSIS_CONFIG, normalizeAnalysisType } from "@/types/analysis";

interface AnalysisPreviewCardProps {
  analysisType: AnalysisType;
  analysisData: any;
  isSelected: boolean;
  onClick: () => void;
}

export const AnalysisPreviewCard = ({ 
  analysisType, 
  analysisData, 
  isSelected, 
  onClick 
}: AnalysisPreviewCardProps) => {
  const config = ANALYSIS_CONFIG[analysisType];
  
  // Extract preview data based on analysis type
  const getPreviewData = () => {
    if (!analysisData?.result) return null;
    
    try {
      const result = typeof analysisData.result === 'string' 
        ? JSON.parse(analysisData.result) 
        : analysisData.result;
      
      switch (analysisType) {
        case 'VibeCheck':
          return {
            overall: result.overallVibe || result.mood || 'Unknown',
            score: result.score || result.vibeScore || 0
          };
        case 'RedFlag':
        case 'GreenFlag':
          return {
            count: result.flags?.length || result.traits?.length || 0,
            severity: result.severity || result.level || 'Medium'
          };
        case 'SimpOMeter':
          return {
            score: result.simpScore || result.score || 0
          };
        case 'GhostRisk':
          return {
            risk: result.riskLevel || result.level || 'Unknown',
            probability: result.probability || result.score || 0
          };
        case 'MainCharacterEnergy':
          return {
            score: result.mceScore || result.score || 0
          };
        case 'EmotionalDepth':
          return {
            score: result.depthScore || result.score || 0
          };
        default:
          return { summary: 'Analysis completed' };
      }
    } catch {
      return { summary: 'Analysis completed' };
    }
  };

  const previewData = getPreviewData();
  
  return (
    <div 
      onClick={onClick}
      className={`text-center p-2 sm:p-3 md:p-4 rounded-xl cursor-pointer transition-all ${
        analysisData 
          ? isSelected
            ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/50 scale-105'
            : 'bg-white/10 border border-white/20 hover:bg-white/15 hover:border-purple-400/30'
          : 'bg-white/5 border border-white/10'
      }`}
    >
      <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">{config.emoji}</div>
      <div className="text-xs sm:text-sm text-white/80 font-medium mb-1 truncate">{config.title}</div>
      {analysisData && previewData ? (
        <div className="text-xs text-white/60">
          {Object.entries(previewData).slice(0, 1).map(([key, value]) => (
            <div key={key} className="truncate">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/40">No data</div>
      )}
    </div>
  );
}; 