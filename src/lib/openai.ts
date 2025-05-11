import { OpenAI } from "openai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ChatStatsSchema } from "../schemas/chatStats";
import prisma from "./prisma";
import { z } from "zod";

const ChatStatsJsonSchema = zodToJsonSchema(ChatStatsSchema, "ChatStats");

export async function analyzeChat(chatId: string): Promise<z.infer<typeof ChatStatsSchema>> {
  const chatJson = await prisma.chat.findUnique({ where: { id: chatId }, include: { messages: true } });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [
      { role: "system", content: "Output only a call to saveStats." },
      { role: "user", content: `Analyze this chat JSON: ${JSON.stringify(chatJson)}` }
    ],
    functions: [
      {
        name:        "saveStats",
        description: "Store stats for a chat",
        parameters:  ChatStatsJsonSchema,
      },
    ],
    function_call: { name: "saveStats" },
  });

  if (!response.choices[0].message.tool_calls) {
    throw new Error("No tool calls found in response");
  }

  const args = JSON.parse(response.choices[0].message.tool_calls[0].function.arguments);
  const parsed = ChatStatsSchema.safeParse(args);
  if (!parsed.success) throw new Error("Invalid stats from LLM");

  return parsed.data;
}