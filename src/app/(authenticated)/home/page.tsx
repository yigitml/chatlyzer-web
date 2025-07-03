"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useMessageStore } from "@/store/messageStore";
import { useAnalysisStore } from "@/store/analysisStore";
import { useCreditStore } from "@/store/creditStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, FileText, Upload, Zap, Crown, Sparkles, MessageCircle, Edit2, Check, ChevronLeft, ChevronRight, BarChart3, CheckCircle, XCircle, Bolt, Trash2 } from "lucide-react";
import { ChatPostRequest, ChatDeleteRequest, AnalysisType } from "@/types/api/apiRequest";
import { convertChatExport, ChatPlatform } from "@/utils/messageConverter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";
import { Chat } from "@prisma/client";
import { getStorageItem, setStorageItem, LOCAL_STORAGE_KEYS } from "@/utils/storage";

// Type conversion utilities
const snakeToCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const normalizeAnalysisType = (type: string): AnalysisType | null => {
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
const ANALYSIS_CONFIG: Record<AnalysisType, { emoji: string; title: string; description: string }> = {
  VibeCheck: { emoji: "🔮", title: "Vibe Check", description: "Overall energy & chemistry" },
  ChatStats: { emoji: "📊", title: "Chat Stats", description: "Numbers & patterns" },
  RedFlag: { emoji: "🚩", title: "Red Flags", description: "Warning signs detected" },
  GreenFlag: { emoji: "✅", title: "Green Flags", description: "Healthy relationship vibes" },
  SimpOMeter: { emoji: "💕", title: "Simp-O-Meter", description: "One-sided energy levels" },
  GhostRisk: { emoji: "👻", title: "Ghost Risk", description: "Left on read probability" },
  MainCharacterEnergy: { emoji: "⭐", title: "Main Character", description: "Dramatic flair detected" },
  EmotionalDepth: { emoji: "💙", title: "Emotional Depth", description: "Genuine connection level" }
};

// Modular Components
const LoadingSpinner = ({ size = "sm" }: { size?: "sm" | "lg" }) => (
  <div className={`border-2 border-white/20 border-t-white rounded-full animate-spin ${size === "lg" ? "w-8 h-8" : "w-4 h-4"}`} />
);

const StatusBadge = ({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "error" }) => {
  const variants = {
    default: "bg-white/10 text-white",
    success: "bg-green-500/20 text-green-300 border border-green-500/30",
    error: "bg-red-500/20 text-red-300 border border-red-500/30"
  };
  
  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium ${variants[variant]}`}>
      {children}
    </div>
  );
};

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) => (
  <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border ${
      type === "success" 
        ? "bg-green-500/20 border-green-500/30 text-green-300" 
        : "bg-red-500/20 border-red-500/30 text-red-300"
    }`}>
      {type === "success" ? (
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-auto p-1 text-white/60 hover:text-white"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

// Skeleton Components
const SkeletonCard = () => (
  <div className="bg-white/5 border-white/20 rounded-lg border p-4">
    <div className="animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-full"></div>
        <div className="space-y-2">
          <div className="h-4 bg-white/20 rounded w-24"></div>
          <div className="h-3 bg-white/15 rounded w-32"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/15 rounded w-full"></div>
        <div className="h-3 bg-white/15 rounded w-3/4"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

const SkeletonAnalysisGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="animate-pulse bg-white/10 rounded-xl p-2 sm:p-3 md:p-4 h-16 sm:h-20 flex flex-col items-center justify-center">
        <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white/20 rounded mb-1 sm:mb-2"></div>
        <div className="h-2 sm:h-3 bg-white/15 rounded w-8 sm:w-12"></div>
      </div>
    ))}
  </div>
);

const ChatCard = ({ 
  chat, 
  isSelected, 
  isEditing, 
  editTitle, 
  onSelect, 
  onEdit, 
  onSave, 
  onCancel, 
  onTitleChange, 
  isUpdating 
}: {
  chat: Chat;
  isSelected: boolean;
  isEditing: boolean;
  editTitle: string;
  onSelect: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onTitleChange: (title: string) => void;
  isUpdating: boolean;
}) => (
  <div className={`group p-4 rounded-xl transition-all cursor-pointer ${
    isSelected ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'
  }`}>
    {isEditing ? (
      <div className="space-y-3">
        <Input
          value={editTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-white/10 border-white/20 text-white"
          placeholder="Chat title..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave} disabled={isUpdating || !editTitle.trim()}>
            {isUpdating ? <LoadingSpinner /> : <Check className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={isUpdating}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    ) : (
      <div onClick={onSelect}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white truncate">{chat.title || "Untitled Chat"}</h3>
            <p className="text-sm text-white/60 mt-1">
              {new Date(chat.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )}
  </div>
);

// Analysis Preview Card
const AnalysisPreviewCard = ({ 
  analysisType, 
  analysisData, 
  isSelected, 
  onClick 
}: { 
  analysisType: AnalysisType; 
  analysisData: any; 
  isSelected: boolean;
  onClick: () => void;
}) => {
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

// Credits display component
const CreditsDisplay = ({ credits }: { credits: number }) => {
  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
      <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
      <span className="font-mono text-sm text-white whitespace-nowrap">{credits.toLocaleString()}</span>
    </div>
  );
};

// Analysis UI Components
const MetricCard = ({ title, value, icon }: { title: string; value: string; icon: string }) => (
  <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-xl font-bold text-white">{value}</div>
    <div className="text-sm text-white/60">{title}</div>
  </div>
);

const ScoreCard = ({ 
  title, 
  score, 
  maxScore, 
  description, 
  isPercentage = false 
}: { 
  title: string; 
  score: number; 
  maxScore: number; 
  description: string; 
  isPercentage?: boolean;
}) => {
  const percentage = (score / maxScore) * 100;
  const displayValue = isPercentage ? `${Math.round(score)}%` : `${score}/${maxScore}`;
  
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-lg font-bold text-purple-400">{displayValue}</span>
      </div>
      <p className="text-sm text-white/60 mb-3">{description}</p>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

const InsightCard = ({ title, items, icon }: { title: string; items: string[]; icon: string }) => (
  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">{icon}</span>
      <h3 className="font-semibold text-white">{title}</h3>
    </div>
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={index} className="text-sm text-white/80">• {item}</div>
      ))}
    </div>
  </div>
);

const WarningCard = ({ 
  title, 
  description, 
  severity, 
  examples = [], 
  isGreenFlag = false 
}: { 
  title: string; 
  description: string; 
  severity: number; 
  examples?: any[]; 
  isGreenFlag?: boolean;
}) => {
  const colorClass = isGreenFlag ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10';
  const textColorClass = isGreenFlag ? 'text-green-300' : 'text-red-300';
  
  return (
    <div className={`rounded-xl p-4 border ${colorClass}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-bold ${textColorClass}`}>{title}</h3>
        <span className={`text-sm font-bold ${textColorClass}`}>{severity}/10</span>
      </div>
      <p className="text-white/80 text-sm mb-3">{description}</p>
      {examples.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/60">Examples:</p>
          {examples.slice(0, 2).map((example, index) => (
            <MessageExampleCard key={index} example={example} />
          ))}
        </div>
      )}
    </div>
  );
};

const ComparisonCard = ({ 
  title, 
  user1Name, 
  user1Value, 
  user2Name, 
  user2Value, 
  icon 
}: { 
  title: string; 
  user1Name: string; 
  user1Value: string; 
  user2Name: string; 
  user2Value: string; 
  icon: string;
}) => {
  const val1 = parseInt(user1Value) || 0;
  const val2 = parseInt(user2Value) || 0;
  const total = val1 + val2;
  const user1Percentage = total > 0 ? (val1 / total) * 100 : 50;
  
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-left">
          <div className="text-sm font-medium text-white">{user1Name}</div>
          <div className="text-xs text-purple-400">{user1Value} ({Math.round(user1Percentage)}%)</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">{user2Name}</div>
          <div className="text-xs text-pink-400">{user2Value} ({Math.round(100 - user1Percentage)}%)</div>
        </div>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 flex overflow-hidden">
        <div 
          className="bg-purple-500 h-full"
          style={{ width: `${user1Percentage}%` }}
        />
        <div 
          className="bg-pink-500 h-full"
          style={{ width: `${100 - user1Percentage}%` }}
        />
      </div>
    </div>
  );
};

const MessageExampleCard = ({ example }: { example: any }) => (
  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-medium text-purple-300">{example.sender}</span>
      <span className="text-xs text-white/40">{example.timestamp}</span>
    </div>
    <p className="text-sm text-white/80">{example.contentSnippet || example.content}</p>
  </div>
);

const TimelineCard = ({ phases }: { phases: any[] }) => (
  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">📈</span>
      <h3 className="font-semibold text-white">Conversation Timeline</h3>
    </div>
    <div className="space-y-3">
      {phases.map((phase, index) => (
        <div key={index} className="flex items-center gap-3">
          <span className="text-lg">{getPhaseEmoji(phase.phase)}</span>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{phase.phase}</div>
            <div className="text-xs text-white/60">
              {phase.start} {phase.end && `- ${phase.end}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Helper functions
const getPhaseEmoji = (phase: string) => {
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

const getVibeEmoji = (vibe: string) => {
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

const getSimpLevel = (score: number) => {
  if (score <= 3) return 'Balanced';
  if (score <= 6) return 'Mild Simp';
  if (score <= 8) return 'Major Simp';
  return 'Ultra Simp';
};

const getGhostRiskLevel = (riskLevel: string) => {
  return riskLevel || 'Unknown';
};

const getMainCharacterLevel = (score: number) => {
  if (score <= 3) return 'Background Character';
  if (score <= 6) return 'Supporting Character';
  if (score <= 8) return 'Main Character';
  return 'The Protagonist';
};

const getEmotionalDepthLevel = (score: number) => {
  if (score <= 3) return 'Surface Level';
  if (score <= 6) return 'Some Depth';
  if (score <= 8) return 'Deep Connection';
  return 'Soul Baring';
};

// Analysis Builders
const VibeCheckAnalysisBuilder = ({ data }: { data: any }) => {
  const overallVibe = data.overallVibe || 'neutral';
  const emojiScore = data.emojiScore || 0;
  const humorDetected = data.humorDetected || false;
  const keywords = data.keywords || [];
  const moodDescriptors = data.moodDescriptors || [];
  const messageRefs = data.messageRefs || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          title="Overall Vibe" 
          value={overallVibe.charAt(0).toUpperCase() + overallVibe.slice(1)} 
          icon={getVibeEmoji(overallVibe)} 
        />
        <MetricCard 
          title="Humor Detected" 
          value={humorDetected ? "Yes" : "No"} 
          icon={humorDetected ? "😂" : "😐"} 
        />
      </div>
      
      <ScoreCard
        title="Emoji Score"
        score={emojiScore}
        maxScore={10}
        description="How expressive is the conversation"
      />
      
      {keywords.length > 0 && (
        <InsightCard title="Keywords" items={keywords} icon="🔑" />
      )}
      
      {moodDescriptors.length > 0 && (
        <InsightCard title="Mood Descriptors" items={moodDescriptors} icon="🎭" />
      )}
      
      {messageRefs.slice(0, 3).map((ref: any, index: number) => (
        <MessageExampleCard key={index} example={ref} />
      ))}
    </div>
  );
};

const RedFlagAnalysisBuilder = ({ data }: { data: any }) => {
  const flags = data.flags || [];
  
  return (
    <div className="space-y-4">
      <MetricCard 
        title="Red Flags Detected" 
        value={flags.length.toString()} 
        icon="🚩" 
      />
      
      {flags.map((flag: any, index: number) => (
        <WarningCard
          key={index}
          title={flag.label || 'Unknown Flag'}
          description={flag.explanation || ''}
          severity={flag.severity || 0}
          examples={flag.messageRefs || []}
          isGreenFlag={false}
        />
      ))}
    </div>
  );
};

const GreenFlagAnalysisBuilder = ({ data }: { data: any }) => {
  const traits = data.traits || [];
  
  return (
    <div className="space-y-4">
      <MetricCard 
        title="Green Flags Detected" 
        value={traits.length.toString()} 
        icon="✅" 
      />
      
      {traits.map((trait: any, index: number) => (
        <WarningCard
          key={index}
          title={trait.label || 'Unknown Trait'}
          description={trait.explanation || ''}
          severity={trait.positivityScore || 0}
          examples={trait.messageRefs || []}
          isGreenFlag={true}
        />
      ))}
    </div>
  );
};

const SimpOMeterAnalysisBuilder = ({ data }: { data: any }) => {
  const simpScore = data.simpScore || 0;
  const behaviors = data.behaviorsDetected || [];
  const messageRefs = data.messageRefs || [];

  return (
    <div className="space-y-4">
      <ScoreCard
        title="Simp Score"
        score={simpScore}
        maxScore={10}
        description={getSimpLevel(simpScore)}
      />
      
      {behaviors.length > 0 && (
        <InsightCard title="Behaviors Detected" items={behaviors} icon="🎭" />
      )}
      
      {messageRefs.slice(0, 3).map((ref: any, index: number) => (
        <MessageExampleCard key={index} example={ref} />
      ))}
    </div>
  );
};

const GhostRiskAnalysisBuilder = ({ data }: { data: any }) => {
  const riskLevel = data.riskLevel || 'unknown';
  const riskScore = data.riskScore || 0;
  const signals = data.signals || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          title="Risk Level" 
          value={getGhostRiskLevel(riskLevel)} 
          icon="👻" 
        />
        <MetricCard 
          title="Risk Score" 
          value={`${Math.round(riskScore)}/10`} 
          icon="📊" 
        />
      </div>
      
      {signals.map((signal: any, index: number) => (
        <WarningCard
          key={index}
          title={signal.label || 'Unknown Signal'}
          description={signal.explanation || ''}
          severity={riskScore}
          examples={signal.messageRefs || []}
          isGreenFlag={false}
        />
      ))}
    </div>
  );
};

const MainCharacterEnergyAnalysisBuilder = ({ data }: { data: any }) => {
  const mceScore = data.mceScore || 0;
  const traits = data.traits || [];
  const standoutMoments = data.standoutMoments || [];

  return (
    <div className="space-y-4">
      <ScoreCard
        title="Main Character Energy"
        score={mceScore}
        maxScore={10}
        description={getMainCharacterLevel(mceScore)}
      />
      
      {traits.length > 0 && (
        <InsightCard title="Dramatic Traits" items={traits} icon="🎭" />
      )}
      
      {standoutMoments.slice(0, 3).map((moment: any, index: number) => (
        <MessageExampleCard key={index} example={moment} />
      ))}
    </div>
  );
};

const EmotionalDepthAnalysisBuilder = ({ data }: { data: any }) => {
  const depthScore = data.depthScore || 0;
  const topicsTouched = data.topicsTouched || [];
  const vulnerableMoments = data.vulnerableMoments || [];

  return (
    <div className="space-y-4">
      <ScoreCard
        title="Emotional Depth"
        score={depthScore}
        maxScore={10}
        description={getEmotionalDepthLevel(depthScore)}
      />
      
      {topicsTouched.length > 0 && (
        <InsightCard title="Topics Discussed" items={topicsTouched} icon="🧠" />
      )}
      
      {vulnerableMoments.map((moment: any, index: number) => (
        <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h4 className="font-semibold text-white mb-2">{moment.description}</h4>
          {moment.messageRefs?.slice(0, 2).map((ref: any, refIndex: number) => (
            <MessageExampleCard key={refIndex} example={ref} />
          ))}
        </div>
      ))}
    </div>
  );
};

const ChatStatsAnalysisBuilder = ({ data }: { data: any }) => {
  const totals = data.totals || {};
  const vibeBalance = data.vibeBalance || {};
  const userRoles = data.userRoles || [];
  const initiatorStats = data.initiatorStats || {};
  const conversationPhases = data.conversationPhases || [];

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span>📊</span> Overview
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard 
            title="Messages" 
            value={totals.messageCount?.toString() || "0"} 
            icon="💬" 
          />
          <MetricCard 
            title="Words" 
            value={totals.wordCount?.toString() || "0"} 
            icon="📝" 
          />
          <MetricCard 
            title="Emojis" 
            value={totals.emojiCount?.toString() || "0"} 
            icon="😊" 
          />
        </div>
      </div>

      {/* Balance Section */}
      {Object.keys(vibeBalance).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>⚖️</span> Conversation Balance
          </h3>
          <div className="space-y-4">
            <ScoreCard
              title="Mutual Effort"
              score={vibeBalance.mutualEffortScore || 0}
              maxScore={10}
              description="Conversation energy balance"
            />
            <ScoreCard
              title="Emotional Balance"
              score={vibeBalance.emotionalBalance || 0}
              maxScore={10}
              description="Emotional sharing balance"
            />
            <ScoreCard
              title="Engagement Level"
              score={vibeBalance.dryVsJuicyRatio || 0}
              maxScore={100}
              description="% of engaging messages"
              isPercentage={true}
            />
          </div>
        </div>
      )}

      {/* User Comparison */}
      {totals.messagesPerUser && totals.messagesPerUser.length >= 2 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>👥</span> User Activity
          </h3>
          <div className="space-y-4">
            <ComparisonCard
              title="Messages Sent"
              user1Name={totals.messagesPerUser[0]?.username || "User 1"}
              user1Value={totals.messagesPerUser[0]?.messageCount?.toString() || "0"}
              user2Name={totals.messagesPerUser[1]?.username || "User 2"}
              user2Value={totals.messagesPerUser[1]?.messageCount?.toString() || "0"}
              icon="💬"
            />
            {totals.wordsPerUser && totals.wordsPerUser.length >= 2 && (
              <ComparisonCard
                title="Words Written"
                user1Name={totals.wordsPerUser[0]?.username || "User 1"}
                user1Value={totals.wordsPerUser[0]?.wordCount?.toString() || "0"}
                user2Name={totals.wordsPerUser[1]?.username || "User 2"}
                user2Value={totals.wordsPerUser[1]?.wordCount?.toString() || "0"}
                icon="📝"
              />
            )}
          </div>
        </div>
      )}

      {/* Behavior Insights */}
      {userRoles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>🎭</span> Behavior Insights
          </h3>
          <InsightCard
            title="User Personalities"
            items={userRoles.map((role: any) => 
              `${role.username}: ${role.role?.charAt(0).toUpperCase() + role.role?.slice(1) || 'Unknown'}`
            )}
            icon="🎭"
          />
        </div>
      )}

      {/* Initiator Stats */}
      {Object.keys(initiatorStats).length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <MetricCard 
            title="Conversation Starter" 
            value={initiatorStats.mostLikelyToStartConvo || "Unknown"} 
            icon="🚀" 
          />
          <MetricCard 
            title="Gets Ghosted Most" 
            value={initiatorStats.mostGhosted || "Unknown"} 
            icon="👻" 
          />
        </div>
      )}

      {/* Timeline */}
      {conversationPhases.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span>📈</span> Conversation Journey
          </h3>
          <TimelineCard phases={conversationPhases} />
        </div>
      )}
    </div>
  );
};

// Updated Analysis Result Card with structured display
const AnalysisResultCard = ({ analysis }: { analysis: any }) => {
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

export default function UserDashboard() {
  const hasFetchedData = useRef(false);
  
  // Store hooks
  const { user, isInitialized } = useAuthStore();
  const { chats, fetchChats, createChat, updateChat, deleteChat } = useChatStore();
  const { messages, fetchMessages } = useMessageStore();
  const { analyzes, fetchAnalyzes, createAnalysis } = useAnalysisStore();
  const { credits, subscription, fetchCredits, fetchSubscription } = useCreditStore();
  
  // UI State
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType | null>(null);
  const [isLoadingChatData, setIsLoadingChatData] = useState(false);
  
  // Edit Chat State
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  
  // Delete Chat State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  
  // Create Chat Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: string; content: string; timestamp?: Date }[]>([]);
  const [newMessageSender, setNewMessageSender] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [whatsappImportText, setWhatsappImportText] = useState("");
  const [importMode, setImportMode] = useState<"manual" | "whatsapp">("manual");

  const totalCredits = credits.reduce((sum, credit) => sum + credit.amount, 0);
  const selectedChat = chats.find(chat => chat.id === selectedChatId);
  const selectedChatMessages = selectedChatId ? messages.filter(msg => msg.chatId === selectedChatId) : [];
  const selectedChatAnalyzes = selectedChatId ? analyzes.filter(analysis => analysis.chatId === selectedChatId) : [];

  // Helper function to select chat with storage update
  const selectChat = (chatId: string | null) => {
    // Update state optimistically
    setSelectedChatId(chatId);
    // Update storage
    if (chatId) {
      setStorageItem(LOCAL_STORAGE_KEYS.SELECTED_CHAT_ID, chatId);
    }
  };

  // Group analyses by type
  const analysesByType = selectedChatAnalyzes.reduce((acc, analysis) => {
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

  // Toast system
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Optimistic credit update
  const updateCreditsOptimistically = async (creditsUsed: number) => {
    // Optimistic update - subtract credits immediately
    const optimisticCredits = credits.map(credit => ({
      ...credit,
      amount: credit.amount - creditsUsed
    }));
    
    // We would update the store here if we had a setter
    // For now, we'll refetch after a delay
    setTimeout(async () => {
      try {
        await fetchCredits();
      } catch (error) {
        console.error("Failed to refetch credits:", error);
      }
    }, 2000);
  };

  // Data fetching
  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchData = async () => {
      if (hasFetchedData.current || !user?.id) return;
      
      try {
        hasFetchedData.current = true;
        await Promise.all([
          fetchChats(),
          fetchAnalyzes(),
          fetchCredits(),
          fetchSubscription()
        ]);
      } catch (error) {
        hasFetchedData.current = false;
        // Only show error if not aborted
        if (!abortController.signal.aborted && error instanceof Error && error.name !== 'AbortError') {
          showToast(error.message || "Failed to load data", "error");
        }
      }
    };

    fetchData();
    
    return () => {
      abortController.abort();
    };
  }, [user, fetchChats, fetchAnalyzes, fetchCredits, fetchSubscription]);

  useEffect(() => {
    if (!selectedChatId) return;
    
    const abortController = new AbortController();
    
    const fetchChatData = async () => {
      try {
        setIsLoadingChatData(true);
        // Clear previous data to ensure loading state is visible
        setSelectedAnalysisType(null);
        
        await Promise.all([
          fetchMessages({ chatId: selectedChatId }),
          fetchAnalyzes({ chatId: selectedChatId })
        ]);
      } catch (error) {
        // Only show error if not aborted
        if (!abortController.signal.aborted && error instanceof Error && error.name !== 'AbortError') {
          showToast(error.message || "Failed to load chat data", "error");
        }
      } finally {
        // Add small delay to ensure skeleton is visible
        if (!abortController.signal.aborted) {
          setTimeout(() => {
            setIsLoadingChatData(false);
          }, 100);
        }
      }
    };

    fetchChatData();
    
    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [selectedChatId, fetchMessages, fetchAnalyzes]);

  useEffect(() => {
    if (chats.length > 0) {
      // Get stored selected chat ID
      const storedChatId = getStorageItem(LOCAL_STORAGE_KEYS.SELECTED_CHAT_ID, null);
      
      // Check if stored chat exists in current chat list
      const storedChatExists = storedChatId && chats.some(chat => chat.id === storedChatId);
      
      if (storedChatExists && selectedChatId !== storedChatId) {
        // Select the stored chat if it exists and is different from current
        selectChat(storedChatId);
      } else if (!selectedChatId && !storedChatExists) {
        // Select first chat if no current selection and no valid stored chat
        selectChat(chats[0].id);
      }
    }
  }, [chats, selectedChatId]);

  // Handlers
  const handleAnalyzeChat = async () => {
    if (!selectedChatId) return;
    
    try {
      setIsAnalyzing(true);
      updateCreditsOptimistically(8); // Optimistic update
      await createAnalysis({ chatId: selectedChatId });
      await fetchAnalyzes({ chatId: selectedChatId });
      showToast("Analysis complete! The tea has been spilled ☕", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Analysis failed", "error");
      // Refetch credits on error to get correct amount
      await fetchCredits();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateChat = async () => {
    if (!chatTitle.trim()) {
      showToast("Chat title is required bestie", "error");
      return;
    }

    try {
      setIsCreatingChat(true);
      const chatData: ChatPostRequest = {
        title: chatTitle.trim(),
        messages: chatMessages.length > 0 ? chatMessages.map(msg => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp || new Date(),
          metadata: null
        } as any)) : undefined
      };

      const newChat = await createChat(chatData);
      await fetchChats();
      selectChat(newChat.id);
      
      // Reset form
      setChatTitle("");
      setChatMessages([]);
      setNewMessageSender("");
      setNewMessageContent("");
      setWhatsappImportText("");
      setImportMode("manual");
      setIsCreateModalOpen(false);
      
      showToast("Chat created! Ready for analysis ✨", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create chat", "error");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleEditChatTitle = async (chatId: string) => {
    if (!editingTitle.trim()) {
      showToast("Chat title cannot be empty", "error");
      return;
    }

    try {
      setIsUpdatingTitle(true);
      await updateChat({ id: chatId, title: editingTitle.trim() });
      await fetchChats();
      setEditingChatId(null);
      setEditingTitle("");
      showToast("Title updated ✨", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update title", "error");
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;

    try {
      setIsDeletingChat(true);
      const deleteRequest: ChatDeleteRequest = { id: selectedChatId };
      await deleteChat(deleteRequest);
      await fetchChats();
      
      // Clear selection since chat is deleted
      selectChat(null);
      
      setIsDeleteDialogOpen(false);
      showToast("Chat deleted 🗑️", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete chat", "error");
    } finally {
      setIsDeletingChat(false);
    }
  };

  const handleWhatsAppImport = () => {
    if (!whatsappImportText.trim()) {
      showToast("Please paste WhatsApp chat export", "error");
      return;
    }

    try {
      const convertedMessages = convertChatExport(whatsappImportText, ChatPlatform.WHATSAPP);
      
      if (convertedMessages.length === 0) {
        showToast("No valid messages found", "error");
        return;
      }

      const formattedMessages = convertedMessages.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      setChatMessages(formattedMessages);
      
      const participants = [...new Set(formattedMessages.map(msg => msg.sender))];
      const autoTitle = `WhatsApp: ${participants.slice(0, 2).join(" & ")}${participants.length > 2 ? ` +${participants.length - 2}` : ""}`;
      setChatTitle(autoTitle);
      
      showToast(`Imported ${convertedMessages.length} messages 🎉`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to parse WhatsApp export", "error");
    }
  };

  const addMessage = () => {
    if (!newMessageSender.trim() || !newMessageContent.trim()) return;
    
    setChatMessages(prev => [...prev, {
      sender: newMessageSender.trim(),
      content: newMessageContent.trim(),
      timestamp: new Date()
    }]);
    setNewMessageSender("");
    setNewMessageContent("");
  };

  const removeMessage = (index: number) => {
    setChatMessages(prev => prev.filter((_, i) => i !== index));
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="text-white/60 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not authenticated</h1>
          <Link href="/auth/sign-in" className="text-purple-400 hover:text-purple-300">
            Sign in to continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-3 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image src="/favicon.ico" alt="Chatlyzer" width={28} height={28} className="flex-shrink-0" />
            <span className="font-bold text-lg sm:text-xl truncate">Chatlyzer</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <CreditsDisplay credits={totalCredits} />
            
            <Link href="/profile">
              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-white/20 transition-all flex-shrink-0">
                <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                <AvatarFallback>{user.name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-900 border-red-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Chat</DialogTitle>
            <DialogDescription className="text-white/60">
              Are you sure you want to delete "{selectedChat?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingChat}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChat}
              disabled={isDeletingChat}
            >
              {isDeletingChat ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  <span>Deleting...</span>
                </div>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-[calc(100vh-73px)] relative">
        {/* Mobile Sidebar Overlay */}
        {!sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`transition-all duration-300 border-r border-white/10 bg-black z-50 ${
          sidebarCollapsed 
            ? 'w-16' 
            : 'w-80 lg:w-80 md:w-72 sm:w-64 lg:relative fixed lg:translate-x-0'
        } ${sidebarCollapsed ? '' : 'max-w-[80vw]'} ${!sidebarCollapsed ? 'lg:relative fixed inset-y-0 left-0' : ''}`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              {!sidebarCollapsed && (
                <div>
                  <h2 className="font-semibold text-white">Your Chats</h2>
                  <p className="text-sm text-white/60">{chats.length} conversations</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-white/60 hover:text-white"
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>

            {!sidebarCollapsed && (
              <>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full mb-6 bg-white/10 hover:bg-white/20 text-white border-0">
                      <Plus className="w-4 h-4 mr-2" />
                      New Chat
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-gray-900 border-white/20 text-white">
                    <DialogHeader>
                      <DialogTitle>Create New Chat</DialogTitle>
                      <DialogDescription className="text-white/60">
                        Upload your conversation for analysis
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="title">Chat Title</Label>
                        <Input
                          id="title"
                          value={chatTitle}
                          onChange={(e) => setChatTitle(e.target.value)}
                          placeholder="Give this chat a name..."
                          className="bg-white/10 border-white/20 text-white mt-2"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant={importMode === "manual" ? "default" : "outline"}
                          onClick={() => setImportMode("manual")}
                          className="flex-1"
                        >
                          Manual Entry
                        </Button>
                        <Button
                          variant={importMode === "whatsapp" ? "default" : "outline"}
                          onClick={() => setImportMode("whatsapp")}
                          className="flex-1"
                        >
                          WhatsApp Import
                        </Button>
                      </div>

                      {importMode === "whatsapp" ? (
                        <div>
                          <Label>WhatsApp Export</Label>
                          <Textarea
                            value={whatsappImportText}
                            onChange={(e) => setWhatsappImportText(e.target.value)}
                            placeholder="Paste your WhatsApp chat export here..."
                            rows={6}
                            className="bg-white/10 border-white/20 text-white font-mono text-sm mt-2"
                          />
                          <Button
                            onClick={handleWhatsAppImport}
                            disabled={!whatsappImportText.trim()}
                            className="w-full mt-3"
                          >
                            Parse Export
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Label>Messages (Optional)</Label>
                          {chatMessages.length > 0 && (
                            <div className="space-y-2 max-h-32 overflow-y-auto mt-2">
                              {chatMessages.map((msg, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-purple-300">{msg.sender}</p>
                                    <p className="text-sm text-white/80 truncate">{msg.content}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeMessage(i)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <Input
                              placeholder="Sender..."
                              value={newMessageSender}
                              onChange={(e) => setNewMessageSender(e.target.value)}
                              className="bg-white/10 border-white/20 text-white"
                            />
                            <Input
                              placeholder="Message..."
                              value={newMessageContent}
                              onChange={(e) => setNewMessageContent(e.target.value)}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          </div>
                          <Button
                            onClick={addMessage}
                            disabled={!newMessageSender.trim() || !newMessageContent.trim()}
                            variant="outline"
                            className="w-full mt-2"
                          >
                            Add Message
                          </Button>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateChat}
                        disabled={!chatTitle.trim() || isCreatingChat}
                      >
                        {isCreatingChat ? (
                          <div className="flex items-center justify-center gap-2">
                            <LoadingSpinner />
                            <span>Creating...</span>
                          </div>
                        ) : (
                          "Create Chat"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="space-y-2">
                  {chats.length > 0 ? (
                    chats.map(chat => (
                      <ChatCard
                        key={chat.id}
                        chat={chat}
                        isSelected={selectedChatId === chat.id}
                        isEditing={editingChatId === chat.id}
                        editTitle={editingTitle}
                        onSelect={() => selectChat(chat.id)}
                        onEdit={() => {
                          setEditingChatId(chat.id);
                          setEditingTitle(chat.title || "");
                        }}
                        onSave={() => handleEditChatTitle(chat.id)}
                        onCancel={() => {
                          setEditingChatId(null);
                          setEditingTitle("");
                        }}
                        onTitleChange={setEditingTitle}
                        isUpdating={isUpdatingTitle}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 text-sm">No chats yet</p>
                      <p className="text-white/40 text-xs">Create your first chat to get started</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto min-w-0">
                      {selectedChatId ? (
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
                      <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{selectedChat?.title}</h1>
                      <p className="text-sm sm:text-base text-white/60">
                        {selectedChatMessages.length} messages • {selectedChatAnalyzes.length > 0 ? 'Analysis complete' : 'Ready for analysis'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
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
                            setSelectedAnalysisType(
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
                          onClick={handleAnalyzeChat}
                          disabled={isAnalyzing || totalCredits < 8}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {isAnalyzing ? (
                            <div className="flex items-center justify-center gap-2">
                              <LoadingSpinner />
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
                      ) : (
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center max-w-md">
                  <Sparkles className="w-16 sm:w-20 h-16 sm:h-20 text-white/20 mx-auto mb-4 sm:mb-6" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Select a chat to analyze</h2>
                  <p className="text-sm sm:text-base text-white/60 mb-6 sm:mb-8">Choose a conversation from the sidebar to get started</p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}