import { OpenAI } from "openai";
import { ChatlyzerSchemas, ChatlyzerSchemaType } from "../schemas/zodSchemas";
import prisma from "./prisma";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { AnalysisType } from "@/types/api/apiRequest";

export async function analyzeChat<T extends ChatlyzerSchemaType>(
  chatId: string, 
  schema: T,
): Promise<z.infer<T>> {
  const chatJson = await prisma.chat.findUnique({ where: { id: chatId }, include: { messages: true } });

  if (!chatJson) {
    throw new Error("Chat not found");
  }

  const formatTimestamp = (timestamp: Date | string): string => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const minimalChat = {
    title: chatJson.title,
    messages: chatJson.messages.map(msg => ({
      sender: msg.sender,
      timestamp: formatTimestamp(msg.timestamp),
      content: msg.content,
      ...(msg.metadata && { metadata: msg.metadata })
    }))
  };

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const zodRF = zodResponseFormat(schema, "analysis");

  const analysisType = getAnalysisTypeFromSchema(schema);
  
  const detectedLanguage = await detectChatLanguage(minimalChat, openai);
  
  const systemPrompt = getSystemPromptForAnalysisType(analysisType, detectedLanguage);

  try {
    const initialResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { 
          role: "user", 
          content: `Analyze this chat and provide a complete ${analysisType} analysis following the exact format in your instructions:
          Chat: ${JSON.stringify(minimalChat)}`
        }
      ],
      response_format: zodRF
    });
    
    const responseContent = initialResponse.choices[0].message.content;
    if (!responseContent) {
      throw new Error("No content found in response");
    }

    const parsedContent = JSON.parse(responseContent);
    const analysisData = parsedContent.analysis || parsedContent;
    
    const parsed = schema.parse(analysisData);
    return parsed;
  } catch (error) {
    console.error("Error parsing or validating response:", error);
    throw new Error("Failed to parse LLM response");
  }
}

function getAnalysisTypeFromSchema(schema: ChatlyzerSchemaType): AnalysisType {
  const schemaEntries = Object.entries(ChatlyzerSchemas);
  for (const [key, value] of schemaEntries) {
    if (value === schema) {
      return key as AnalysisType;
    }
  }
  return "ChatStats";
}

function getSystemPromptForAnalysisType(analysisType: AnalysisType, language: string): string {
  const languageInstruction = language !== 'en' 
    ? `IMPORTANT: The conversation is in ${getLanguageName(language)}. Please provide your analysis in ${getLanguageName(language)} and consider cultural context appropriate for ${getLanguageName(language)}-speaking users.`
    : '';

  const prompts: Record<AnalysisType, string> = {
    ChatStats: `You are an expert chat statistician. Analyze the conversation and provide comprehensive statistics including message counts, word counts, emoji usage, response times, conversation phases, and user roles. Focus on quantitative metrics and behavioral patterns. ${languageInstruction}`,
    
    RedFlag: `You are an expert relationship analyzer specializing in identifying problematic patterns. Analyze the conversation for potential red flags such as manipulation, gaslighting, love bombing, possessiveness, disrespect, or toxic communication patterns. Be objective and evidence-based. ${languageInstruction}`,
    
    GreenFlag: `You are an expert relationship analyzer specializing in identifying positive patterns. Analyze the conversation for green flags such as respectful communication, healthy boundaries, emotional support, genuine interest, and positive relationship dynamics. ${languageInstruction}`,
    
    VibeCheck: `You are an expert at reading social vibes and communication energy. Analyze the overall mood, energy, humor, awkwardness, and social dynamics of the conversation. Focus on the emotional undertones and social chemistry. ${languageInstruction}`,
    
    SimpOMeter: `You are an expert at analyzing romantic interest and dating dynamics. Analyze the conversation for signs of excessive romantic pursuit, one-sided effort, over-complimenting, or unbalanced romantic investment. Be objective about dating behaviors. ${languageInstruction}`,
    
    GhostRisk: `You are an expert at predicting communication patterns and engagement levels. Analyze the conversation for signs that might indicate someone is losing interest or likely to stop responding (ghosting). Look for engagement patterns, response quality, and communication decline. ${languageInstruction}`,
    
    MainCharacterEnergy: `You are an expert at analyzing personality expression and social presence. Analyze the conversation for main character energy - dramatic flair, storytelling ability, command of attention, confidence, and standout personality moments. ${languageInstruction}`,
    
    EmotionalDepth: `You are an expert at analyzing emotional intelligence and vulnerability in conversations. Analyze the conversation for emotional depth, vulnerability, empathy, meaningful topics, and genuine emotional connection between participants. ${languageInstruction}`
  };

  return prompts[analysisType] || prompts.ChatStats;
}

async function detectChatLanguage(chat: any, openai: OpenAI): Promise<string> {
  const sampleMessages = chat.messages.slice(Math.min(10, Math.floor(chat.messages.length * 0.1)), Math.min(110, chat.messages.length))
    .map((msg: any) => msg.content)
    .join('\n');

  if (!sampleMessages.trim()) {
    return 'en';
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are a language detection expert. Analyze the text and return only the ISO 639-1 language code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'de' for German, 'tr' for Turkish, etc.). If multiple languages are present, return the most dominant one."
        },
        {
          role: "user",
          content: `Detect the language of this text: ${sampleMessages}`
        }
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
}

function getLanguageName(langCode: string): string {
  const languageNames: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'tr': 'Turkish',
    'pl': 'Polish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish'
  };
  
  return languageNames[langCode] || 'the detected language';
}

export async function analyzeAllChatTypes(chatId: string): Promise<z.infer<typeof ChatlyzerSchemas.AllAnalyses>> {
  const chatJson = await prisma.chat.findUnique({ where: { id: chatId }, include: { messages: true } });

  if (!chatJson) {
    throw new Error("Chat not found");
  }

  const formatTimestamp = (timestamp: Date | string): string => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const minimalChat = {
    title: chatJson.title,
    messages: chatJson.messages.map(msg => ({
      sender: msg.sender,
      timestamp: formatTimestamp(msg.timestamp),
      content: msg.content,
      ...(msg.metadata && { metadata: msg.metadata })
    }))
  };

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const detectedLanguage = await detectChatLanguage(minimalChat, openai);
  const languageInstruction = detectedLanguage !== 'en' 
    ? `IMPORTANT: The conversation is in ${getLanguageName(detectedLanguage)}. Please provide your analysis in ${getLanguageName(detectedLanguage)} and consider cultural context appropriate for ${getLanguageName(detectedLanguage)}-speaking users.`
    : '';

  const systemPrompt = `You are an expert chat analyzer capable of performing comprehensive multi-faceted analysis. You will analyze the conversation and provide ALL of the following analysis types in a single response:

1. **Chat Statistics**: Comprehensive statistics including message counts, word counts, emoji usage, response times, conversation phases, and user roles.

2. **Red Flag Analysis**: Identify potential problematic patterns such as manipulation, gaslighting, love bombing, possessiveness, disrespect, or toxic communication patterns.

3. **Green Flag Analysis**: Identify positive patterns such as respectful communication, healthy boundaries, emotional support, genuine interest, and positive relationship dynamics.

4. **Vibe Check**: Analyze the overall mood, energy, humor, awkwardness, and social dynamics of the conversation.

5. **Simp-O-Meter**: Analyze for signs of excessive romantic pursuit, one-sided effort, over-complimenting, or unbalanced romantic investment.

6. **Ghost Risk**: Analyze for signs that might indicate someone is losing interest or likely to stop responding (ghosting).

7. **Main Character Energy**: Analyze for main character energy - dramatic flair, storytelling ability, command of attention, confidence, and standout personality moments.

8. **Emotional Depth**: Analyze for emotional depth, vulnerability, empathy, meaningful topics, and genuine emotional connection between participants.

${languageInstruction}

Provide a complete analysis for ALL categories in the exact format specified in the schema.`;

  try {
    const zodRF = zodResponseFormat(ChatlyzerSchemas.AllAnalyses, "all_analyses");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { 
          role: "user", 
          content: `Analyze this chat comprehensively across all analysis types and provide the complete multi-faceted analysis:
          Chat: ${JSON.stringify(minimalChat)}`
        }
      ],
      response_format: zodRF
    });
    
    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error("No content found in response");
    }

    const parsedContent = JSON.parse(responseContent);
    const analysisData = parsedContent.all_analyses || parsedContent;
    
    const parsed = ChatlyzerSchemas.AllAnalyses.parse(analysisData);
    return parsed;
  } catch (error) {
    console.error("Error parsing or validating all analyses response:", error);
    throw new Error("Failed to parse comprehensive LLM response");
  }
}