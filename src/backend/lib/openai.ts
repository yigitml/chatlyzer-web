import { OpenAI } from "openai";
import { ChatlyzerSchemas, ChatlyzerSchemaType } from "@/shared/schemas/zodSchemas";
import prisma from "./prisma";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { AnalysisType } from "@/shared/types/api/apiRequest";
import { encodingForModel } from "js-tiktoken";
import { detect } from "tinyld";

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


const formatTimestamp = (timestamp: Date | string): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const createMinimalChat = (chatJson: any) => {
  return {
    title: chatJson.title,
    messages: chatJson.messages.map((msg: any) => {
      return {
        sender: msg.sender,
        timestamp: formatTimestamp(msg.timestamp),
        content: msg.content,
        ...(msg.metadata && { metadata: msg.metadata })
      };
    })
  };
};

const createOpenAIClient = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

const createSystemPrompt = (analysisType: AnalysisType, detectedLanguage?: string): string => {
  const basePrompt = ANALYSIS_PROMPTS[analysisType] || ANALYSIS_PROMPTS.ChatStats;
  
  let prompt = `${basePrompt} ${SHARED_INSTRUCTIONS}`;
  if (detectedLanguage && detectedLanguage !== "UNKNOWN") {
    prompt += `\n\nIMPORTANT: The detected primary language of this chat is '${detectedLanguage}' (ISO 639-1 code). You MUST write your entire analysis and all explanations exactly in this language.`;
  }
  
  return prompt.trim();
};

const getDetectedLanguage = (messages: any[]): string => {
  if (!messages || messages.length === 0) return "UNKNOWN";
  
  // Select a message from the middle of the convo
  const middleIndex = Math.floor(messages.length / 2);
  let contentToDetect = messages[middleIndex]?.content || "";
  
  // If the middle message is too short (e.g., just an emoji or "ok"),
  // try to find a slightly longer message nearby to ensure accurate detection
  if (contentToDetect.length < 5) {
    let offset = 1;
    while (middleIndex - offset >= 0 || middleIndex + offset < messages.length) {
      if (middleIndex + offset < messages.length && messages[middleIndex + offset]?.content?.length >= 5) {
        contentToDetect = messages[middleIndex + offset].content;
        break;
      }
      if (middleIndex - offset >= 0 && messages[middleIndex - offset]?.content?.length >= 5) {
        contentToDetect = messages[middleIndex - offset].content;
        break;
      }
      offset++;
      if (offset > 15) break; // Limit search radius
    }
  }

  const detected = detect(contentToDetect);
  return detected || "UNKNOWN";
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
    
    const detectedLanguage = getDetectedLanguage(minimalChat.messages);
    const analysisType = getAnalysisTypeFromSchema(schema);
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
    return schema.parse(analysisData) as z.infer<T>;
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
    
    const detectedLanguage = getDetectedLanguage(minimalChat.messages);
    let systemPrompt = `${COMPREHENSIVE_ANALYSIS_PROMPT}\n\n${SHARED_INSTRUCTIONS}`;
    if (detectedLanguage && detectedLanguage !== "UNKNOWN") {
      systemPrompt += `\n\nIMPORTANT: The detected primary language of this chat is '${detectedLanguage}' (ISO 639-1 code). You MUST write your entire analysis and all explanations exactly in this language.`;
    }
    systemPrompt = systemPrompt.trim();

    const smallChat = smartChatSampler(minimalChat.messages);

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
    throw new Error(`Failed to perform comprehensive chat analysis, ${error}`);
  }
}

// Helper function to create minimal chat structure from raw messages
const createMinimalChatFromMessages = (title: string, messages: any[]) => {
  return {
    title,
    messages: messages.map((msg: any) => {
      return {
        sender: msg.sender,
        timestamp: formatTimestamp(msg.timestamp),
        content: msg.content,
        ...(msg.metadata && { metadata: msg.metadata })
      };
    })
  };
};

export const smallChatBuilder = (messages: any[]) => {
  // Deprecated: Use smartChatSampler instead for better token management
  return smartChatSampler(messages, 100000);
};

/**
 * Smartly samples messages to fit within a target token limit.
 * Estimates tokens conservatively (1 token ~= 4 chars) and samples uniformly if limit is exceeded.
 */
export const smartChatSampler = (messages: any[], targetTokenLimit: number = 10000) => {
  if (!messages || messages.length === 0) return [];

  // Use gpt-4 encoding (cl100k_base) as a safe proxy for gpt-4o-mini (o200k_base).
  // cl100k_base is generally less efficient, so it provides a conservative estimate.
  const enc = encodingForModel("gpt-4");

  // Helper to count tokens for a message object
  const countTokens = (msg: any) => {
    // Estimate overhead for JSON structure (sender, timestamp keys etc)
    // A safe buffer for JSON syntax overhead per message is ~20 tokens.
    const overhead = 20; 
    const contentTokens = enc.encode(msg.content || "").length;
    const metadataTokens = enc.encode(msg.sender || "").length + enc.encode(msg.timestamp || "").length;
    
    return contentTokens + metadataTokens + overhead;
  };

  let totalTokens = 0;
  // Calculate total tokens first
  for (const msg of messages) {
    totalTokens += countTokens(msg);
  }

  // If within limit, return all
  if (totalTokens <= targetTokenLimit) {
    return messages;
  }

  // If over limit, we need to sample.
  // We use a ratio based on total tokens to determine target count.
  const ratio = targetTokenLimit / totalTokens;
  const targetCount = Math.floor(messages.length * ratio);
  
  if (targetCount < 1) return messages.slice(0, 1);

  const sampledMessages = [];
  const interval = messages.length / targetCount;
  let currentTokens = 0;
  
  // Sample uniformly
  for (let i = 0; i < targetCount; i++) {
    const index = Math.floor(i * interval);
    if (index < messages.length) {
      const msg = messages[index];
      const tokens = countTokens(msg);
      
      // Stop if adding this message would exceed limit (strict enforcement)
      if (currentTokens + tokens > targetTokenLimit) {
        break; 
      }
      
      sampledMessages.push(msg);
      currentTokens += tokens;
    }
  }

  console.log(`SmartSampler: Reduced ${messages.length} messages (${totalTokens} actual tokens) to ${sampledMessages.length} messages (${currentTokens} tokens) to fit ${targetTokenLimit} limit.`);
  
  return sampledMessages;
};

export async function analyzeAllChatTypesPrivate(
  chatTitle: string, 
  messages: any[]
): Promise<z.infer<typeof ChatlyzerSchemas.AllAnalyses>> {
  try {
    const minimalChat = createMinimalChatFromMessages(chatTitle, messages);
    const openai = createOpenAIClient();
    
    const detectedLanguage = getDetectedLanguage(minimalChat.messages);
    let systemPrompt = `${COMPREHENSIVE_ANALYSIS_PROMPT}\n\n${SHARED_INSTRUCTIONS}`;
    if (detectedLanguage && detectedLanguage !== "UNKNOWN") {
      systemPrompt += `\n\nIMPORTANT: The detected primary language of this chat is '${detectedLanguage}' (ISO 639-1 code). You MUST write your entire analysis and all explanations exactly in this language.`;
    }
    systemPrompt = systemPrompt.trim();

    const smallChat = smartChatSampler(minimalChat.messages);

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
    throw new Error(`Failed to perform comprehensive privacy chat analysis, ${error}`);
  }
}