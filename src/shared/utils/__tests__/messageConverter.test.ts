import { expect, it } from "vitest";
import { convertChatExport, ChatPlatform } from "../messageConverter";

it.each([
  [ChatPlatform.WHATSAPP, "[01.01.2026, 12:00:00] Alex: Hello\nMore text"],
  [ChatPlatform.WHATSAPP, "01.01.26, 12:00 - Alex: Hello"],
  [ChatPlatform.TELEGRAM, "[01.01.2026 12:00:00] Alex: Hello"],
  [ChatPlatform.DISCORD, "[01-Jan-26 12:00:00] Alex: Hello"],
  [ChatPlatform.GENERIC, "Alex: Hello"],
])("parses %s exports", (platform, input) => {
  const result = convertChatExport(input);
  expect(result.platform).toBe(platform);
  expect(result.messages).toHaveLength(1);
  expect(result.messages[0].sender).toBe("Alex");
  expect(result.messages[0].content).toContain("Hello");
  expect(Number.isFinite(result.messages[0].timestamp.getTime())).toBe(true);
});

it("parses US slash AM/PM and retains seconds, Unicode marks and continuation text", () => {
  const { messages } = convertChatExport("\u200e9/29/26, 12:34:56\u202fPM - Alex: Hello\nSecond line\n9/30/26, 12:01 AM - Sam: Hi");
  expect(messages.map(m => m.content)).toEqual(["Hello\nSecond line", "Hi"]);
  expect(messages[0].timestamp.getMonth()).toBe(8);
  expect(messages[0].timestamp.getDate()).toBe(29);
  expect(messages[0].timestamp.getHours()).toBe(12);
  expect(messages[0].timestamp.getSeconds()).toBe(56);
  expect(messages[1].timestamp.getHours()).toBe(0);
});
it("requires a date order for ambiguous slash dates", () => {
  expect(() => convertChatExport("09/10/26, 10:00 - Alex: Hello")).toThrow("Ambiguous");
  const { messages } = convertChatExport("09/10/26, 10:00 - Alex: Hello", ChatPlatform.WHATSAPP, { dateOrder: "dmy" });
  expect(messages[0].timestamp.getMonth()).toBe(9);
  expect(messages[0].timestamp.getDate()).toBe(9);
});
it.each([ChatPlatform.TELEGRAM, ChatPlatform.DISCORD])("preserves %s multiline content", platform => {
  const header = platform === ChatPlatform.TELEGRAM ? "[01.01.2026 12:00:00]" : "[01-Jan-26 12:00:00]";
  expect(convertChatExport(`${header} Alex: Hello\n\nContinuation`, platform).messages[0].content).toBe("Hello\n\nContinuation");
});
it.each(["31.02.2026, 12:00 - Alex: invalid", "[31-Feb-26 12:00:00] Alex: invalid", "[31.02.2026 12:00:00] Alex: invalid"])("rejects rolled calendar dates %s", input => {
  expect(() => convertChatExport(input)).toThrow("Invalid export date");
});
it("rejects unsupported timestamp exports and preserves realistic long messages", () => {
  expect(() => convertChatExport("2026-09-29 12:34 Alex: Hello")).toThrow();
  expect(convertChatExport("01.01.26, 12:00 - Alex: " + "a".repeat(501)).messages[0].content).toHaveLength(501);
  expect(() => convertChatExport("01.01.26, 12:00 - Alex: " + "a".repeat(20001))).toThrow("20,000");
});
