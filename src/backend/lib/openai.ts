import { OpenAI } from "openai";
import { ChatlyzerSchemas, ChatlyzerSchemaType } from "@/shared/schemas/zodSchemas";
import prisma from "./prisma";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { AnalysisType } from "@/shared/types/api/apiRequest";
import { encodingForModel } from "js-tiktoken";
import { detect } from "tinyld";
import { getRequiredServerEnv } from "@/shared/config/env";

const MODELS = {
  MAIN: "gpt-4o-mini",
} as const;

const SHARED_INSTRUCTIONS = 'IMPORTANT: All numerical ratings are 1-10. You MUST provide qualitative balance in EVERY text field. For the "overview" object AND EVERY single array item (like flags, traits, signals), the "explanation" MUST be extremely deep, highly detailed, and at least 2 paragraphs (100+ words) long. You are an expert analyst—do not give shallow 1-2 sentence answers. Write comprehensive, magazine-style deep dives analyzing the psychology, subtext, and dynamics of the chat. Detect the primary language of the chat and write your entire analysis in that language.';

const ANALYSIS_PROMPTS: Record<AnalysisType, string> = {
  ChatStats: "You are an expert chat statistician. Analyze the conversation and provide comprehensive statistics including message counts, word counts, emoji usage, response times, conversation phases, and user roles. Focus on quantitative metrics and behavioral patterns.",
  
  RedFlag: "You are an expert relationship analyzer specializing in identifying problematic patterns. Analyze the conversation for potential red flags such as manipulation, gaslighting, love bombing, possessiveness, disrespect, or toxic communication patterns. Be objective and evidence-based.",
  
  GreenFlag: "You are an expert relationship analyzer specializing in identifying positive patterns. Analyze the conversation for green flags such as respectful communication, healthy boundaries, emotional support, genuine interest, and positive relationship dynamics.",
  
  VibeCheck: "You are an expert at reading social vibes and communication energy. Analyze the overall mood, energy, humor, awkwardness, and social dynamics of the conversation. Focus on the emotional undertones and social chemistry.",
  
  SimpOMeter: "You are an expert at analyzing romantic interest and dating dynamics. Analyze the conversation for signs of excessive romantic pursuit, one-sided effort, over-complimenting, or unbalanced romantic investment. Be objective about dating behaviors.",
  
  GhostRisk: "You are an expert at predicting communication patterns and engagement levels. Analyze the conversation for signs that might indicate someone is losing interest or likely to stop responding (ghosting). Look for engagement patterns, response quality, and communication decline.",
  
  MainCharacterEnergy: "You are an expert at analyzing personality expression and social presence. Analyze the conversation for main character energy - dramatic flair, storytelling ability, command of attention, confidence, and standout personality moments.",
  
  EmotionalDepth: "You are an expert at analyzing emotional intelligence and vulnerability in conversations. Analyze the conversation for emotional depth, vulnerability, empathy, meaningful topics, and genuine emotional connection between participants."
};

const COMPREHENSIVE_ANALYSIS_PROMPT = `You are an expert chat analyzer capable of performing comprehensive multi-faceted analysis. You will analyze the conversation and provide ALL of the following analysis types in a single response.

IMPORTANT: For each analysis section, you must:
- Populate the "overview" with a massive, highly detailed 100+ word explanation and deep emotional context.
- For EVERY single trait, flag, or signal you find, the "explanation" MUST be an extremely thorough, 1-3 paragraph deep-dive (100+ words). NEVER use 1-2 short sentences. Break down the psychology, subtext, and relationship dynamics in exhaustive detail.
- Balance numerical scores with highly analytical, empathetic, and descriptive long-form language.

1. **Chat Statistics**: Comprehensive statistics including message counts, word counts, emoji usage, response times, conversation phases, and user roles.
2. **Red Flag Analysis**: Identify potential problematic patterns such as manipulation, gaslighting, love bombing, possessiveness, disrespect, or toxic communication patterns.
3. **Green Flag Analysis**: Identify positive patterns such as respectful communication, healthy boundaries, emotional support, genuine interest, and positive relationship dynamics.
4. **Vibe Check**: Analyze the overall mood, energy, humor, awkwardness, and social dynamics of the conversation.
5. **Simp-O-Meter**: Analyze for signs of excessive romantic pursuit, one-sided effort, over-complimenting, or unbalanced romantic investment.
6. **Ghost Risk**: Analyze for signs that might indicate someone is losing interest or likely to stop responding (ghosting).
7. **Main Character Energy**: Analyze for main character energy - dramatic flair, storytelling ability, command of attention, confidence, and standout personality moments.
8. **Emotional Depth**: Analyze for emotional depth, vulnerability, empathy, meaningful topics, and genuine emotional connection between participants.

Provide a complete analysis for ALL categories in the exact format specified in the schema.`;


type ProviderMessage = { id: string; sender: string; timestamp: string; content: string };
const encoder = encodingForModel("gpt-4");
const INPUT_TOKEN_LIMIT = 12_000;
const createOpenAIClient = () => new OpenAI({ apiKey: getRequiredServerEnv("OPENAI_API_KEY"), timeout: 60_000, maxRetries: 0 });

function normalizeMessages(messages: any[]): ProviderMessage[] {
  return messages.map((message, index) => ({
    id: String(message.id || `input-${index}`),
    sender: String(message.sender),
    timestamp: new Date(message.timestamp).toISOString(),
    content: String(message.content),
  })).sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
}

/** Budget serialized provider fields; arbitrary metadata is deliberately omitted. */
export const smartChatSampler = (messages: any[], targetTokenLimit = 10_000): ProviderMessage[] => {
  if (!Number.isSafeInteger(targetTokenLimit) || targetTokenLimit <= 0) throw new Error("Invalid input budget");
  const normalized = normalizeMessages(messages || []).map(message => ({ ...message,
    // Qualitative excerpts bound tokenizer CPU on long repetitive exports. Exact
    // metrics still use full messages, and sampling disclosure includes excerpts.
    content: message.content.length > 2000 ? `${message.content.slice(0,1500)}\n[content excerpted]\n${message.content.slice(-500)}` : message.content,
  }));
  // Tokenize bounded individual records, never an arbitrarily large/repetitive blob.
  const costs = normalized.map(message => {
    const json = JSON.stringify(message);
    return Buffer.byteLength(json, "utf8") > targetTokenLimit * 8 ? Infinity : encoder.encode(json).length + 1;
  });
  const total = costs.reduce((sum, cost) => sum + cost, 2);
  if (total <= targetTokenLimit) return normalized;
  const selected: ProviderMessage[] = [];
  const finiteTotal = costs.filter(Number.isFinite).reduce((sum,cost)=>sum+cost,2);
  const approximateCount = Math.max(1, Math.min(normalized.length, Math.floor(normalized.length * targetTokenLimit / finiteTotal)));
  let used = 2;
  for (let i = 0; i < approximateCount; i++) {
    const index = Math.floor(i * normalized.length / approximateCount);
    if (used + costs[index] <= targetTokenLimit) { selected.push(normalized[index]); used += costs[index]; }
  }
  // JSON boundary token merges may differ from record sums; trim until exact serialization fits.
  while (selected.length && encoder.encode(JSON.stringify(selected)).length > targetTokenLimit) selected.pop();

  return selected;
};
export const smallChatBuilder = (messages: any[]) => smartChatSampler(messages);

/** Exact UTC statistics over every active input message, before qualitative sampling. */
export function deterministicChatStats(messages: any[]) {
  const all = normalizeMessages(messages);
  const counts = new Map<string, { messages: number; words: number; emojis: Map<string, number>; responses: number[]; starts: number; unanswered: number }>();
  const days = new Map<string, number>();
  let wordCount = 0, emojiCount = 0;
  for (let i = 0; i < all.length; i++) {
    const message = all[i];
    const stat = counts.get(message.sender) || { messages: 0, words: 0, emojis: new Map(), responses: [] as number[], starts: 0, unanswered: 0 };
    counts.set(message.sender, stat);
    const words = message.content.trim().split(/\s+/u).filter(Boolean).length;
    stat.messages++; stat.words += words; wordCount += words;
    for (const emoji of message.content.match(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu) || []) {
      stat.emojis.set(emoji, (stat.emojis.get(emoji) || 0) + 1); emojiCount++;
    }
    const day = message.timestamp.slice(0, 10); days.set(day, (days.get(day) || 0) + 1);
    const previous = all[i - 1];
    const gap = previous ? (Date.parse(message.timestamp) - Date.parse(previous.timestamp)) / 1000 : Infinity;
    if (!previous || gap >= 6 * 3600) {
      stat.starts++;
      if (previous) counts.get(previous.sender)!.unanswered++;
    }
    if (previous && previous.sender !== message.sender) stat.responses.push(gap);
  }
  if (all.length) counts.get(all.at(-1)!.sender)!.unanswered++;
  const entries = [...counts.entries()];
  const sortedDays = [...days.keys()].sort();
  let maxStreak = 0, current = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    current = i && Date.parse(sortedDays[i]) - Date.parse(sortedDays[i - 1]) === 86_400_000 ? current + 1 : 1;
    maxStreak = Math.max(maxStreak, current);
  }
  const mostActiveDay = [...days.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
  return {
    totals: { messageCount: all.length, wordCount, emojiCount, wordsPerUser: entries.map(([username,s]) => ({ username, wordCount: s.words })), messagesPerUser: entries.map(([username,s]) => ({ username, messageCount: s.messages })) },
    emojiUsage: entries.map(([username,s]) => ({ username, emojis: [...s.emojis].map(([emoji,count]) => ({ emoji,count })) })),
    avgResponseTime: entries.map(([username,s]) => ({ username, responseTimeSeconds: s.responses.length ? s.responses.reduce((a,b)=>a+b,0)/s.responses.length : 0 })),
    initiatorStats: { mostLikelyToStartConvo: [...entries].sort((a,b)=>b[1].starts-a[1].starts)[0]?.[0] || "", mostGhosted: [...entries].sort((a,b)=>b[1].unanswered-a[1].unanswered)[0]?.[0] || "", openerFrequency: entries.map(([username,s])=>({username,timesStarted:s.starts})) },
    chatStreak: { maxConsecutiveDays: maxStreak, currentStreakDays: current, mostActiveDay },
  };
}

async function fetchChatData(chatId: string, userId: string) {
  const chat = await prisma.chat.findFirst({ where: { id: chatId, ...(userId ? { userId } : {}), deletedAt: null, user: { isActive: true, deletedAt: null } }, include: { messages: { where: { deletedAt: null, ...(userId ? { userId } : {}) }, orderBy: [{ timestamp: "asc" }, { id: "asc" }] } } });
  if (!chat) throw new Error("Active owned chat not found");
  return chat;
}

function getDetectedLanguage(messages: ProviderMessage[]) { return detect(messages.find(m => m.content.length >= 5)?.content || "") || "UNKNOWN"; }
function boundedPayload(title: string, messages: any[], systemPrompt: string) {
  const all = normalizeMessages(messages);
  const sample = smartChatSampler(all, 8_000);
  if (!sample.length) throw new Error("No message fits the provider input budget");
  const sampling = { totalMessages: all.length, sampledMessages: sample.length, qualitativeSampled: sample.length !== all.length || sample.some(message => all.find(original => original.id === message.id)?.content !== message.content), statisticsScope: "full_conversation", timeBasis: "UTC", currentStreakBasis: "latest_message_day" };
  const exactStats = deterministicChatStats(all);
  const content = JSON.stringify({ title, messages: sample, sampling, exactStats });
  if (encoder.encode(systemPrompt + content).length > INPUT_TOKEN_LIMIT) throw new Error("Serialized provider input exceeds budget");
  return { content, sampling, exactStats, sample };
}

function sanitizeReferences(value: any, valid: Map<string, ProviderMessage>): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child) && (key === "messageRefs" || key === "standoutMoments")) {
      value[key] = child.filter(ref => valid.has(ref.messageId)).map(ref => ({ ...ref, timestamp: valid.get(ref.messageId)!.timestamp, contentSnippet: valid.get(ref.messageId)!.content.slice(0, 240) }));
    } else if (child && typeof child === "object") sanitizeReferences(child, valid);
  }
}

async function comprehensive(title: string, messages: any[]): Promise<z.infer<typeof ChatlyzerSchemas.AllAnalyses>> {
  const normalized = normalizeMessages(messages);
  const language = getDetectedLanguage(normalized);
  const systemPrompt = `${COMPREHENSIVE_ANALYSIS_PROMPT}\n${SHARED_INSTRUCTIONS}\nLanguage: ${language}. Exact numeric statistics are supplied; use them unchanged. Qualitative results describe only sampled messages; cite only supplied stable message IDs.`;
  const payload = boundedPayload(title, normalized, systemPrompt);
  const response = await createOpenAIClient().chat.completions.create({ model: MODELS.MAIN, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: payload.content }], response_format: zodResponseFormat(ChatlyzerSchemas.AllAnalyses, "all_analyses"), max_completion_tokens: 12_000, store: false });
  const raw = response.choices[0]?.message.content;
  if (!raw) throw new Error("Empty provider output");
  const parsed = JSON.parse(raw);
  const output = ChatlyzerSchemas.AllAnalyses.parse(parsed.analysis || parsed.all_analyses || parsed);
  Object.assign(output.analyses.chatStats, payload.exactStats);
  for (const result of Object.values(output.analyses)) Object.assign(result, { sampling: payload.sampling });
  sanitizeReferences(output, new Map(payload.sample.map(message => [message.id,message])));
  return output;
}
export async function analyzeAllChatTypes(chatId: string, userId: string) {
  const chat = await fetchChatData(chatId, userId);
  return comprehensive(chat.title || "", chat.messages);
}
export async function analyzeAllChatTypesPrivate(title: string, messages: any[]) { return comprehensive(title, messages); }
export async function analyzeChat<T extends ChatlyzerSchemaType>(chatId: string, schema: T, userId: string): Promise<z.infer<T>> {
  const chat = await fetchChatData(chatId, userId);
  const type = (Object.entries(ChatlyzerSchemas).find(([,value])=>value === schema)?.[0] || "ChatStats") as AnalysisType;
  const prompt = `${ANALYSIS_PROMPTS[type] || ""} ${SHARED_INSTRUCTIONS}`;
  const payload = boundedPayload(chat.title || "", chat.messages, prompt);
  const response = await createOpenAIClient().chat.completions.create({ model: MODELS.MAIN, messages: [{ role:"system",content:prompt }, { role:"user",content:payload.content }], response_format:zodResponseFormat(schema,"analysis"), max_completion_tokens:12_000, store:false });
  const raw = JSON.parse(response.choices[0]?.message.content || "null");
  const output = schema.parse(raw?.analysis || raw) as z.infer<T>;
  if (type === "ChatStats") Object.assign(output as object, payload.exactStats);
  Object.assign(output as object, { sampling: payload.sampling });
  sanitizeReferences(output, new Map(payload.sample.map(message => [message.id,message])));
  return output;
}
