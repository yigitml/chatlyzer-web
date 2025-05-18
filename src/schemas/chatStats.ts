   import { z } from "zod"

   export const ChatStatsSchema = z.object({
     totals: z.object({
       messageCount: z.number(),
       wordsPerUser: z.record(z.number()),
       messagesPerUser: z.record(z.number()),
     }),
     emojiUsage: z.record(z.record(z.number())),
     avgResponseTime: z.record(z.number()),
   })