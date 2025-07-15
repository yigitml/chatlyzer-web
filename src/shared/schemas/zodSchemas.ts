import { z } from "zod";

export const ChatStatsSchema = z.object({
  type: z.literal("chat_stats"),
  totals: z.object({
    messageCount: z.number(),
    wordCount: z.number(),
    wordsPerUser: z.array(z.object({
      username: z.string(),
      wordCount: z.number()
    })),
    messagesPerUser: z.array(z.object({
      username: z.string(),
      messageCount: z.number()
    })),
    emojiCount: z.number(),
  }),

  emojiUsage: z.array(z.object({
    username: z.string(),
    emojis: z.array(z.object({
      emoji: z.string(),
      count: z.number()
    }))
  })),

  avgResponseTime: z.array(z.object({
    username: z.string(),
    responseTimeSeconds: z.number()
  })),

  vibeBalance: z.object({
    mutualEffortScore: z.number(), // How equal is the convo energy
    emotionalBalance: z.number(), // Emotional sharing balance
    dryVsJuicyRatio: z.number(),  // % of juicy vs boring msgs
  }),

  userRoles: z.array(z.object({
    username: z.string(),
    role: z.enum(["rizzler", "vibe-curator", "empath", "ghost", "main character", "dry texter", "hypebeast", "simp"])
  })),

  initiatorStats: z.object({
    mostLikelyToStartConvo: z.string(),
    mostGhosted: z.string(),
    openerFrequency: z.array(z.object({
      username: z.string(),
      timesStarted: z.number()
    })),
  }),

  deepMoments: z.array(z.object({
    user: z.string(),
    snippet: z.string(),
    timestamp: z.string(),
    tags: z.array(z.string()) // e.g., ["vulnerable", "real talk", "existential"]
  })),

  emojiPersona: z.array(z.object({
    username: z.string(),
    topEmoji: z.string(),
    emojiMoodType: z.enum(["fire", "cry", "skull", "nail", "heart", "devil", "cool", "brain"]),
  })),

  chatStreak: z.object({
    maxConsecutiveDays: z.number(),
    currentStreakDays: z.number(),
    mostActiveDay: z.string(), // ISO date
  }),

  conversationPhases: z.array(z.object({
    phase: z.enum(["intro", "honeymoon", "drift", "real talk", "dry spell", "rekindled"]),
    start: z.string(),
    end: z.string(),
  })),

  vibeTimeline: z.array(z.object({
    timestamp: z.string(),
    vibe: z.enum(["flirty", "funny", "awkward", "deep", "dry", "chaotic", "neutral"]),
    dominantSpeaker: z.string(),
  })),
});

// Common message reference
export const MessageRefSchema = z.object({
  messageId: z.string(),
  contentSnippet: z.string(),
  sender: z.enum(["user", "other"]),
  timestamp: z.string(), // ISO timestamp
});

// 1. Red Flag Analysis
export const RedFlagAnalysisSchema = z.object({
  type: z.literal("red_flag"),
  flags: z.array(z.object({
    label: z.string(), // e.g., "Gaslighting", "Love bombing"
    severity: z.number(),
    explanation: z.string(),
    messageRefs: z.array(MessageRefSchema),
  }))
});

// 2. Green Flag Analysis
export const GreenFlagAnalysisSchema = z.object({
  type: z.literal("green_flag"),
  traits: z.array(z.object({
    label: z.string(), // e.g., "Respectful boundaries", "Clear communication"
    positivityScore: z.number(),
    explanation: z.string(),
    messageRefs: z.array(MessageRefSchema),
  }))
});

// 3. Vibe Check Analysis
export const VibeCheckAnalysisSchema = z.object({
  type: z.literal("vibe_check"),
  overallVibe: z.enum(["positive", "neutral", "awkward", "flirty", "chaotic", "dry"]),
  keywords: z.array(z.string()),
  emojiScore: z.number(),
  humorDetected: z.boolean(),
  moodDescriptors: z.array(z.string()),
  messageRefs: z.array(MessageRefSchema),
});

// 4. Simp-O-Meter Analysis
export const SimpOMeterAnalysisSchema = z.object({
  type: z.literal("simp_o_meter"),
  simpScore: z.number(),
  behaviorsDetected: z.array(z.string()), // e.g., "excessive compliments", "one-sided texting"
  messageRefs: z.array(MessageRefSchema),
});

// 5. Ghost Risk Analysis
export const GhostRiskAnalysisSchema = z.object({
  type: z.literal("ghost_risk"),
  riskLevel: z.enum(["low", "medium", "high"]),
  signals: z.array(z.object({
    label: z.string(), // e.g., "Delayed replies", "Dry responses"
    explanation: z.string(),
    messageRefs: z.array(MessageRefSchema),
  })),
  riskScore: z.number(),
});

// 6. Main Character Energy Analysis
export const MainCharacterEnergyAnalysisSchema = z.object({
  type: z.literal("main_character_energy"),
  mceScore: z.number(),
  traits: z.array(z.string()), // e.g., "Flamboyant humor", "Dramatic storytelling"
  standoutMoments: z.array(MessageRefSchema),
});

// 7. Emotional Depth Analysis
export const EmotionalDepthAnalysisSchema = z.object({
  type: z.literal("emotional_depth"),
  depthScore: z.number(),
  vulnerableMoments: z.array(z.object({
    description: z.string(),
    messageRefs: z.array(MessageRefSchema),
  })),
  topicsTouched: z.array(z.string()), // e.g., "family", "identity", "trauma"
});

// Combined schema for all analyses in one API call
export const AllAnalysesSchema = z.object({
  type: z.literal("all_analyses"),
  analyses: z.object({
    chatStats: ChatStatsSchema.omit({ type: true }),
    redFlag: RedFlagAnalysisSchema.omit({ type: true }),
    greenFlag: GreenFlagAnalysisSchema.omit({ type: true }),
    vibeCheck: VibeCheckAnalysisSchema.omit({ type: true }),
    simpOMeter: SimpOMeterAnalysisSchema.omit({ type: true }),
    ghostRisk: GhostRiskAnalysisSchema.omit({ type: true }),
    mainCharacterEnergy: MainCharacterEnergyAnalysisSchema.omit({ type: true }),
    emotionalDepth: EmotionalDepthAnalysisSchema.omit({ type: true }),
  })
});

export const ChatlyzerSchemas = {
  ChatStats: ChatStatsSchema,
  RedFlag: RedFlagAnalysisSchema,
  GreenFlag: GreenFlagAnalysisSchema,
  VibeCheck: VibeCheckAnalysisSchema,
  SimpOMeter: SimpOMeterAnalysisSchema,
  GhostRisk: GhostRiskAnalysisSchema,
  MainCharacterEnergy: MainCharacterEnergyAnalysisSchema,
  EmotionalDepth: EmotionalDepthAnalysisSchema,
  AllAnalyses: AllAnalysesSchema,
} as const;

export type ChatlyzerSchemaType = typeof ChatlyzerSchemas[keyof typeof ChatlyzerSchemas];