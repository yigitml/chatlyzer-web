import { AnalysisType } from "./api/apiRequest";

// Type conversion utilities
export const snakeToCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const normalizeAnalysisType = (type: string): AnalysisType | null => {
  // Convert snake_case to camelCase first
  const camelCase = snakeToCamelCase(type);
  // Handle specific mappings
  const typeMap: Record<string, AnalysisType> = {
    'vibeCheck': 'VibeCheck',
    'vibe_check': 'VibeCheck',
    'chatStats': 'ChatStats', 
    'chat_stats': 'ChatStats',
    'redFlag': 'RedFlag',
    'red_flag': 'RedFlag',
    'greenFlag': 'GreenFlag',
    'green_flag': 'GreenFlag',
    'simpOMeter': 'SimpOMeter',
    'simp_o_meter': 'SimpOMeter',
    'simp_meter': 'SimpOMeter',
    'ghostRisk': 'GhostRisk',
    'ghost_risk': 'GhostRisk',
    'mainCharacterEnergy': 'MainCharacterEnergy',
    'main_character_energy': 'MainCharacterEnergy',
    'emotionalDepth': 'EmotionalDepth',
    'emotional_depth': 'EmotionalDepth'
  };
  
  return typeMap[camelCase] || typeMap[type] || null;
};

// Analysis type configuration
export const ANALYSIS_CONFIG: Record<AnalysisType, { emoji: string; title: string; description: string }> = {
  VibeCheck: { emoji: "🔮", title: "Vibe Check", description: "Overall energy & chemistry" },
  ChatStats: { emoji: "📊", title: "Chat Stats", description: "Numbers & patterns" },
  RedFlag: { emoji: "🚩", title: "Red Flags", description: "Warning signs detected" },
  GreenFlag: { emoji: "✅", title: "Green Flags", description: "Healthy relationship vibes" },
  SimpOMeter: { emoji: "💕", title: "Simp-O-Meter", description: "One-sided energy levels" },
  GhostRisk: { emoji: "👻", title: "Ghost Risk", description: "Left on read probability" },
  MainCharacterEnergy: { emoji: "⭐", title: "Main Character", description: "Dramatic flair detected" },
  EmotionalDepth: { emoji: "💙", title: "Emotional Depth", description: "Genuine connection level" }
};

// Helper functions
export const getPhaseEmoji = (phase: string) => {
  const phaseEmojis: Record<string, string> = {
    'intro': '👋',
    'honeymoon': '💕',
    'drift': '🌊',
    'real talk': '💭',
    'dry spell': '🏜️',
    'rekindled': '🔥'
  };
  return phaseEmojis[phase?.toLowerCase()] || '📅';
};

export const getVibeEmoji = (vibe: string) => {
  const vibeEmojis: Record<string, string> = {
    'positive': '😊',
    'flirty': '😘',
    'funny': '😂',
    'awkward': '😬',
    'chaotic': '🤪',
    'dry': '😐'
  };
  return vibeEmojis[vibe?.toLowerCase()] || '😐';
};

export const getSimpLevel = (score: number) => {
  if (score <= 3) return 'Balanced';
  if (score <= 6) return 'Mild Simp';
  if (score <= 8) return 'Major Simp';
  return 'Ultra Simp';
};

export const getGhostRiskLevel = (riskLevel: string) => {
  return riskLevel || 'Unknown';
};

export const getMainCharacterLevel = (score: number) => {
  if (score <= 3) return 'Background Character';
  if (score <= 6) return 'Supporting Character';
  if (score <= 8) return 'Main Character';
  return 'The Protagonist';
};

export const getEmotionalDepthLevel = (score: number) => {
  if (score <= 3) return 'Surface Level';
  if (score <= 6) return 'Some Depth';
  if (score <= 8) return 'Deep Connection';
  return 'Soul Baring';
}; 