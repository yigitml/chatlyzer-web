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
