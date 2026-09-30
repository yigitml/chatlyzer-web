import { z } from "zod";

const idSchema = z.string().trim().min(1);
// Metadata is bounded at the API boundary and omitted from provider input.
const optionalMetadataSchema = z.record(z.string().max(120), z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.null()]))
  .refine(value => JSON.stringify(value).length <= 4096, "Metadata must fit within 4096 characters").nullable().optional();
const messageInputSchema = z.object({
  sender: z.string().trim().min(1).max(120),
  timestamp: z.coerce.date(),
  content: z.string().trim().min(1).max(20000),
  metadata: optionalMetadataSchema,
});

export const authRefreshSchema = z.object({
  refreshToken: z.string().trim().min(1).optional(),
});

export const chatPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  messages: z.array(messageInputSchema).min(1).max(20000),
});

export const chatPutSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(200).optional(),
});

export const idBodySchema = z.object({
  id: idSchema,
});

export const messagePostSchema = z.object({
  chatId: idSchema,
  sender: z.string().trim().min(1).max(120),
  timestamp: z.coerce.date().optional(),
  content: z.string().trim().min(1).max(20000),
  metadata: optionalMetadataSchema,
});

export const messagePutSchema = z.object({
  id: idSchema,
  content: z.string().trim().min(1).max(20000).optional(),
  metadata: optionalMetadataSchema,
}).refine((value) => value.content !== undefined || value.metadata !== undefined, {
  message: "No fields to update",
});

export const analysisPostSchema = z.object({
  chatId: idSchema,
  requestKey: z.string().trim().min(1).max(120).optional(),
});

export const analysisPutSchema = z.object({
  id: idSchema,
  result: z.unknown(),
});

export const privacyAnalysisPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  isGhostMode: z.boolean(),
  requestKey: z.string().trim().min(1).max(120).optional(),
  messages: z.array(messageInputSchema).min(1).max(20000),
});

export const userPutSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  image: z.string().url().nullable().optional(),
  isOnboarded: z.boolean().optional(),
}).refine(
  (value) =>
    value.name !== undefined ||
    value.image !== undefined ||
    value.isOnboarded !== undefined,
  { message: "No fields to update" },
);

export function getValidationMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("; ");
}
