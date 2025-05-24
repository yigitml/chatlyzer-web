import { OpenAI } from "openai";
import { ChatlyzerSchemas, ChatlyzerSchemaType } from "../schemas/zodSchemas";
import prisma from "./prisma";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { AnalysisType } from "@/types/api/apiRequest";

export async function analyzeChat<T extends ChatlyzerSchemaType>(
  chatId: string, 
  schema: T
): Promise<z.infer<T>> {
  const chatJson = await prisma.chat.findUnique({ where: { id: chatId }, include: { messages: true } });

  if (!chatJson) {
    throw new Error("Chat not found");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const zodRF = zodResponseFormat(schema, "analysis");

  // Get analysis type from schema
  const analysisType = getAnalysisTypeFromSchema(schema);
  const systemPrompt = getSystemPromptForAnalysisType(analysisType);

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
          Chat JSON: ${JSON.stringify(chatJson)}`
        }
      ],
      response_format: zodRF
    });
    
    const responseContent = initialResponse.choices[0].message.content;
    if (!responseContent) {
      throw new Error("No content found in response");
    }

    const parsedContent = JSON.parse(responseContent);
    // Extract the analysis property from the response
    const analysisData = parsedContent.analysis || parsedContent;
    
    const parsed = schema.parse(analysisData);
    return parsed;
  } catch (error) {
    console.error("Error parsing or validating response:", error);
    throw new Error("Failed to parse LLM response");
  }
}

function getAnalysisTypeFromSchema(schema: ChatlyzerSchemaType): AnalysisType {
  // Find the analysis type by checking the schema's type field or matching against known schemas
  const schemaEntries = Object.entries(ChatlyzerSchemas);
  for (const [key, value] of schemaEntries) {
    if (value === schema) {
      return key as AnalysisType;
    }
  }
  return "ChatStats"; // Default fallback
}

function getSystemPromptForAnalysisType(analysisType: AnalysisType): string {
  const prompts: Record<AnalysisType, string> = {
    ChatStats: `You are an expert chat statistician. Analyze the conversation and provide comprehensive statistics including message counts, word counts, emoji usage, response times, conversation phases, and user roles. Focus on quantitative metrics and behavioral patterns.`,
    
    RedFlag: `You are an expert relationship analyzer specializing in identifying problematic patterns. Analyze the conversation for potential red flags such as manipulation, gaslighting, love bombing, possessiveness, disrespect, or toxic communication patterns. Be objective and evidence-based.`,
    
    GreenFlag: `You are an expert relationship analyzer specializing in identifying positive patterns. Analyze the conversation for green flags such as respectful communication, healthy boundaries, emotional support, genuine interest, and positive relationship dynamics.`,
    
    VibeCheck: `You are an expert at reading social vibes and communication energy. Analyze the overall mood, energy, humor, awkwardness, and social dynamics of the conversation. Focus on the emotional undertones and social chemistry.`,
    
    SimpOMeter: `You are an expert at analyzing romantic interest and dating dynamics. Analyze the conversation for signs of excessive romantic pursuit, one-sided effort, over-complimenting, or unbalanced romantic investment. Be objective about dating behaviors.`,
    
    GhostRisk: `You are an expert at predicting communication patterns and engagement levels. Analyze the conversation for signs that might indicate someone is losing interest or likely to stop responding (ghosting). Look for engagement patterns, response quality, and communication decline.`,
    
    MainCharacterEnergy: `You are an expert at analyzing personality expression and social presence. Analyze the conversation for main character energy - dramatic flair, storytelling ability, command of attention, confidence, and standout personality moments.`,
    
    EmotionalDepth: `You are an expert at analyzing emotional intelligence and vulnerability in conversations. Analyze the conversation for emotional depth, vulnerability, empathy, meaningful topics, and genuine emotional connection between participants.`
  };

  return prompts[analysisType] || prompts.ChatStats;
}