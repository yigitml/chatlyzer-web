import { OpenAI } from "openai";
import { ChatlyzerSchemas, ChatlyzerSchemaType } from "@/shared/schemas/zodSchemas";
import prisma from "./prisma";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { AnalysisType } from "@/shared/types/api/apiRequest";

const MODELS = {
  MAIN: "gpt-4o-mini",
  LANGUAGE_DETECTION: "gpt-4.1-nano"
} as const;

const RATING_INSTRUCTION = 'IMPORTANT: All numerical ratings, scores, and measurements should be provided on a scale of 1-10 (where 10 is the highest/strongest).';

const LANGUAGE_DETECTION_PROMPT = "You are a language detection expert. Analyze the text and return only the ISO 639-1 language code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'de' for German, 'tr' for Turkish, etc.). If multiple languages are present, return the most dominant one.";

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
  'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
  'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
  'tr': 'Turkish', 'pl': 'Polish', 'nl': 'Dutch', 'sv': 'Swedish',
  'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish'
};

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

const COMPREHENSIVE_ANALYSIS_PROMPT = `You are an expert chat analyzer capable of performing comprehensive multi-faceted analysis. You will analyze the conversation and provide ALL of the following analysis types in a single response:

1. **Chat Statistics**: Comprehensive statistics including message counts, word counts, emoji usage, response times, conversation phases, and user roles.
2. **Red Flag Analysis**: Identify potential problematic patterns such as manipulation, gaslighting, love bombing, possessiveness, disrespect, or toxic communication patterns.
3. **Green Flag Analysis**: Identify positive patterns such as respectful communication, healthy boundaries, emotional support, genuine interest, and positive relationship dynamics.
4. **Vibe Check**: Analyze the overall mood, energy, humor, awkwardness, and social dynamics of the conversation.
5. **Simp-O-Meter**: Analyze for signs of excessive romantic pursuit, one-sided effort, over-complimenting, or unbalanced romantic investment.
6. **Ghost Risk**: Analyze for signs that might indicate someone is losing interest or likely to stop responding (ghosting).
7. **Main Character Energy**: Analyze for main character energy - dramatic flair, storytelling ability, command of attention, confidence, and standout personality moments.
8. **Emotional Depth**: Analyze for emotional depth, vulnerability, empathy, meaningful topics, and genuine emotional connection between participants.

Provide a complete analysis for ALL categories in the exact format specified in the schema.`;

const formatTimestamp = (timestamp: Date | string): string => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const createMinimalChat = (chatJson: any) => ({
  title: chatJson.title,
  messages: chatJson.messages.map((msg: any) => ({
    sender: msg.sender,
    timestamp: formatTimestamp(msg.timestamp),
    content: msg.content,
    ...(msg.metadata && { metadata: msg.metadata })
  }))
});

const createOpenAIClient = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getLanguageName = (langCode: string): string => 
  LANGUAGE_NAMES[langCode] || 'the detected language';

const createLanguageInstruction = (language: string): string => 
  language !== 'en' 
    ? `IMPORTANT: The conversation is in ${getLanguageName(language)}. Please provide your analysis in ${getLanguageName(language)} and consider cultural context appropriate for ${getLanguageName(language)}-speaking users.`
    : '';

const getAnalysisTypeFromSchema = (schema: ChatlyzerSchemaType): AnalysisType => {
  const schemaEntries = Object.entries(ChatlyzerSchemas);
  for (const [key, value] of schemaEntries) {
    if (value === schema) {
      return key as AnalysisType;
    }
  }
  return "ChatStats";
};

const parseOpenAIResponse = (responseContent: string | null) => {
  if (!responseContent) {
    throw new Error("No content found in response");
  }
  
  const parsedContent = JSON.parse(responseContent);
  return parsedContent.analysis || parsedContent.all_analyses || parsedContent;
};

const detectChatLanguage = async (chat: any, openai: OpenAI): Promise<string> => {
  const totalMessages = chat.messages.length;
  
  if (totalMessages === 0) {
    return 'en';
  }
  
  const n = Math.floor(totalMessages / 2);
  const startIndex = Math.max(0, n - 10);
  const endIndex = Math.min(totalMessages, n + 11);
  
  const sampleMessages = chat.messages
    .slice(startIndex, endIndex)
    .map((msg: any) => msg.content)
    .join(' ')
    .slice(0, 200);

  if (!sampleMessages.trim()) {
    return 'en';
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.LANGUAGE_DETECTION,
      messages: [
        { role: "system", content: LANGUAGE_DETECTION_PROMPT },
        { role: "user", content: `Detect the language: ${sampleMessages}` }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const detectedLang = response.choices[0].message.content?.trim().toLowerCase() || 'en';
    return /^[a-z]{2,3}$/.test(detectedLang) ? detectedLang : 'en';
  } catch (error) {
    console.warn("Language detection failed, defaulting to English:", error);
    return 'en';
  }
};

const createSystemPrompt = (analysisType: AnalysisType, language: string): string => {
  const basePrompt = ANALYSIS_PROMPTS[analysisType] || ANALYSIS_PROMPTS.ChatStats;
  const languageInstruction = createLanguageInstruction(language);
  
  return `${basePrompt} ${RATING_INSTRUCTION} ${languageInstruction}`.trim();
};

const fetchChatData = async (chatId: string) => {
  const chatJson = await prisma.chat.findUnique({ 
    where: { id: chatId }, 
    include: { 
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    } 
  });

  if (!chatJson) {
    throw new Error("Chat not found");
  }

  return chatJson;
};

export async function analyzeChat<T extends ChatlyzerSchemaType>(
  chatId: string, 
  schema: T,
): Promise<z.infer<T>> {
  try {
    const chatJson = await fetchChatData(chatId);
    const minimalChat = createMinimalChat(chatJson);
    const openai = createOpenAIClient();
    
    const analysisType = getAnalysisTypeFromSchema(schema);
    const detectedLanguage = await detectChatLanguage(minimalChat, openai);
    const systemPrompt = createSystemPrompt(analysisType, detectedLanguage);
    const content = `Analyze this chat and provide a complete ${analysisType} analysis following the exact format in your instructions:\nChat: ${JSON.stringify(minimalChat)}`;

    console.log(content);
    const response = await openai.chat.completions.create({
      model: MODELS.MAIN,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: content
        }
      ],
      response_format: zodResponseFormat(schema, "analysis")
    });
    
    const analysisData = parseOpenAIResponse(response.choices[0].message.content);
    return schema.parse(analysisData);
  } catch (error) {
    console.error("Error in analyzeChat:", error);
    throw new Error("Failed to analyze chat");
  }
}

export async function analyzeAllChatTypes(chatId: string): Promise<z.infer<typeof ChatlyzerSchemas.AllAnalyses>> {
  try {
    const chatJson = await fetchChatData(chatId);
    const minimalChat = createMinimalChat(chatJson);
    const openai = createOpenAIClient();
    
    const detectedLanguage = await detectChatLanguage(minimalChat, openai);
    const languageInstruction = createLanguageInstruction(detectedLanguage);
    
    const systemPrompt = `${COMPREHENSIVE_ANALYSIS_PROMPT}\n\n${RATING_INSTRUCTION}\n\n${languageInstruction}`.trim();

    const smallChat = smallChatBuilder(minimalChat.messages);

    const response = await openai.chat.completions.create({
      model: MODELS.MAIN,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Analyze this chat comprehensively across all analysis types and provide the complete multi-faceted analysis:\nChat: ${JSON.stringify(smallChat)}`
        }
      ],
      response_format: zodResponseFormat(ChatlyzerSchemas.AllAnalyses, "all_analyses")
    });
    
    const analysisData = parseOpenAIResponse(response.choices[0].message.content);
    return ChatlyzerSchemas.AllAnalyses.parse(analysisData);
  } catch (error) {
    console.error("Error in analyzeAllChatTypes:", error);
    throw new Error("Failed to perform comprehensive chat analysis");
  }
}

// Helper function to create minimal chat structure from raw messages
const createMinimalChatFromMessages = (title: string, messages: any[]) => ({
  title,
  messages: messages.map((msg: any) => ({
    sender: msg.sender,
    timestamp: formatTimestamp(msg.timestamp),
    content: msg.content,
    ...(msg.metadata && { metadata: msg.metadata })
  }))
});

export const smallChatBuilder = (messages: any[]) => {
  if (messages.length > 25000) {
    const sampledMessages = [];
    const interval = messages.length / 25000;
    for (let i = 0; i < 25000; i++) {
      sampledMessages.push(messages[Math.floor(i * interval)]);
    }
    return sampledMessages;
  }
  return messages;
};

export async function analyzeAllChatTypesPrivate(
  chatTitle: string, 
  messages: any[]
): Promise<z.infer<typeof ChatlyzerSchemas.AllAnalyses>> {
  try {
    const minimalChat = createMinimalChatFromMessages(chatTitle, messages);
    const openai = createOpenAIClient();
    
    const detectedLanguage = await detectChatLanguage(minimalChat, openai);
    const languageInstruction = createLanguageInstruction(detectedLanguage);
    
    const systemPrompt = `${COMPREHENSIVE_ANALYSIS_PROMPT}\n\n${RATING_INSTRUCTION}\n\n${languageInstruction}`.trim();

    const smallChat = smallChatBuilder(minimalChat.messages);

    const response = await openai.chat.completions.create({
      model: MODELS.MAIN,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Analyze this chat comprehensively across all analysis types and provide the complete multi-faceted analysis:\nChat: ${JSON.stringify(smallChat)}`
        }
      ],
      response_format: zodResponseFormat(ChatlyzerSchemas.AllAnalyses, "all_analyses")
    });
    
    const analysisData = parseOpenAIResponse(response.choices[0].message.content);
    return ChatlyzerSchemas.AllAnalyses.parse(analysisData);
  } catch (error) {
    console.error("Error in analyzeAllChatTypesPrivate:", error);
    throw new Error("Failed to perform comprehensive privacy chat analysis");
  }
}