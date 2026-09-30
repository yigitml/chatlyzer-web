import { expect, it } from "vitest";
import { chatPostSchema, privacyAnalysisPostSchema } from "../requestSchemas";
const message = { sender: "Alex", timestamp: "2026-09-30T12:34:56Z", content: "x".repeat(500) };
it("accepts inclusive boundaries and realistic long exports in every mode", () => {
  for (const content of [message.content, "x".repeat(501), "x".repeat(20000)]) {
    expect(chatPostSchema.safeParse({ title: "Export", messages: [{ ...message, content }] }).success).toBe(true);
    expect(privacyAnalysisPostSchema.safeParse({ title: "Export", isGhostMode: true, messages: [{ ...message, content }] }).success).toBe(true);
  }
});
it("rejects oversized messages and metadata before external provider work", () => {
  for (const patch of [{ content: "x".repeat(20001) }, { metadata: { oversized: "x".repeat(500000) } }, { metadata: { nested: { unknown: "payload" } } }]) {
    expect(chatPostSchema.safeParse({ title: "Export", messages: [{ ...message, ...patch }] }).success).toBe(false);
  }
});
it("accepts null metadata sent by supported import clients", () => {
  expect(chatPostSchema.safeParse({ title: "Export", messages: [{ ...message, metadata: null }] }).success).toBe(true);
  expect(privacyAnalysisPostSchema.safeParse({ title: "Export", isGhostMode: false, messages: [{ ...message, metadata: null }] }).success).toBe(true);
});
