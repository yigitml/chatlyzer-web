import { Message } from "../../generated/client";

// Types for parsed messages (before conversion to full Message objects)
export interface ParsedMessage {
  sender: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Supported chat platforms
export enum ChatPlatform {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  GENERIC = 'generic'
}

export interface ExportParseOptions { dateOrder?: "dmy" | "mdy" }

function checkedDate(year: number, month: number, day: number, hours: number, minutes: number, seconds: number): Date {
  const value = new Date(year, month - 1, day, hours, minutes, seconds);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day || value.getHours() !== hours || value.getMinutes() !== minutes || value.getSeconds() !== seconds) {
    throw new Error("Invalid export date or time; check the format and date order");
  }
  return value;
}
function exportTimestamp(dateStr: string, timeStr: string, order?: "dmy" | "mdy"): Date {
  const parts = dateStr.split(/[./]/).map(Number);
  let [day, month, year] = parts;
  if (dateStr.includes("/")) {
    const resolved = order || (parts[0] > 12 ? "dmy" : parts[1] > 12 ? "mdy" : undefined);
    if (!resolved) throw new Error("Ambiguous slash dates: select day/month/year or month/day/year before importing");
    if (resolved === "mdy") [month, day, year] = parts;
  }
  if (year < 100) year += year <= 50 ? 2000 : 1900;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) throw new Error("Unsupported export time");
  let hours = Number(match[1]);
  if (match[4]) {
    if (hours < 1 || hours > 12) throw new Error("Invalid 12-hour export time");
    hours = hours % 12 + (match[4].toUpperCase() === "PM" ? 12 : 0);
  }
  return checkedDate(year, month, day, hours, Number(match[2]), Number(match[3] || 0));
}
const whatsappHeader = /^(?:\[)?(\d{1,2}[./]\d{1,2}[./]\d{2,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)(?:\]\s*|\s+-\s+)(.*)$/i;
function normalizeExport(text: string) {
  return text.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").replace(/[\u00a0\u202f]/g, " ").replace(/\r\n?/g, "\n");
}

// Abstract base converter class
abstract class MessageConverter {
  abstract platform: ChatPlatform;
  abstract parseMessages(rawText: string, options?: ExportParseOptions): ParsedMessage[];
  
  // Convert parsed messages to Message objects (without DB-specific fields)
  convertToMessages(parsedMessages: ParsedMessage[]): Omit<Message, 'id' | 'chatId' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
    return parsedMessages.map(msg => ({
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata || null
    }));
  }
}

// WhatsApp message converter
class WhatsAppConverter extends MessageConverter {
  platform = ChatPlatform.WHATSAPP;

  // System messages (tr, en, de)
  private static readonly SYSTEM_MESSAGES = [
    // English
    "Messages and calls are end-to-end encrypted.",
    "You joined using an invite link",
    "You're now an admin",
    "You created this group",
    "You were added",
    "You added",
    "You removed",
    "You left",
    "You changed the group description",
    "You changed the group name",
    "You changed the group icon",
    "This message was deleted",
    "Missed voice call",
    "Missed video call",

    // Turkish
    "Mesajlar ve aramalar uçtan uca şifrelenmiştir.",
    "Bir davet bağlantısı kullanarak katıldınız",
    "Artık bir yöneticisiniz",
    "Bu grubu sen oluşturdun",
    "Eklendiniz",
    "Eklediniz",
    "Çıkardınız",
    "Gruptan ayrıldınız",
    "Grup açıklamasını değiştirdiniz",
    "Grup adını değiştirdiniz",
    "Grup simgesini değiştirdiniz",
    "Bu mesaj silindi",
    "Cevapsız sesli arama",
    "Cevapsız görüntülü arama",

    // German
    "Nachrichten und Anrufe sind Ende-zu-Ende-verschlüsselt.",
    "Du bist über einen Einladungslink beigetreten",
    "Du bist jetzt Admin",
    "Du hast diese Gruppe erstellt",
    "Du wurdest hinzugefügt",
    "Du hast hinzugefügt",
    "Du hast entfernt",
    "Du hast die Gruppe verlassen",
    "Du hast die Gruppenbeschreibung geändert",
    "Du hast den Gruppennamen geändert",
    "Du hast das Gruppenbild geändert",
    "Diese Nachricht wurde gelöscht",
    "Verpasster Sprachanruf",
    "Verpasster Videoanruf"
  ];

  parseMessages(rawText: string, options?: ExportParseOptions): ParsedMessage[] {
    const lines = rawText.split('\n');
    const unambiguousOrders = lines.map(line => line.match(whatsappHeader)?.[1]).filter((date): date is string => !!date && date.includes('/')).map(date => date.split('/').map(Number)).filter(parts => parts[0] > 12 || parts[1] > 12).map(parts => parts[0] > 12 ? "dmy" as const : "mdy" as const);
    if (new Set(unambiguousOrders).size > 1) throw new Error("Mixed export date orders; import each export separately");
    const inferredOrder = unambiguousOrders[0];
    const messages: ParsedMessage[] = [];
    let currentMessage: string[] | null = null;
    let currentSender: string | null = null;
    let currentTimestamp: Date | null = null;

    for (const line of lines) {
      const match = line.match(whatsappHeader);
      if (match) {
        // Finalize previous message if exists
        if (currentSender && currentMessage && currentTimestamp) {
          messages.push({
            sender: currentSender,
            content: currentMessage.join('\n').trim(),
            timestamp: currentTimestamp,
            metadata: { platform: this.platform }
          });
        }

        const [, dateStr, timeStr, rest] = match;
        const timestamp = exportTimestamp(dateStr, timeStr, options?.dateOrder || inferredOrder);
        if (!timestamp) continue;

        const colonIndex = rest.indexOf(':');

        if (colonIndex > 0) {
          const sender = rest.substring(0, colonIndex).trim();
          const content = rest.substring(colonIndex + 1).trim();

          if (this.isSystemMessage(content)) {
            messages.push({
              sender: "System",
              content: content,
              timestamp: timestamp,
              metadata: {
                platform: this.platform,
                messageType: "system"
              }
            });
            currentSender = null;
            currentMessage = null;
            currentTimestamp = null;
            continue;
          }

          currentSender = sender;
          currentTimestamp = timestamp;
          currentMessage = [content];
        } else {
          // System message without colon
          if (this.isSystemMessage(rest)) {
            messages.push({
              sender: "System",
              content: rest.trim(),
              timestamp: timestamp,
              metadata: {
                platform: this.platform,
                messageType: "system"
              }
            });
            currentSender = null;
            currentMessage = null;
            currentTimestamp = null;
          } else {
            // Unexpected format, skip
            currentSender = null;
            currentMessage = null;
            currentTimestamp = null;
          }
        }
      } else {
        // Continuation of multi-line message
        if (currentMessage) {
          currentMessage.push(line);
        }
      }
    }

    // Final flush
    if (currentSender && currentMessage && currentTimestamp) {
      messages.push({
        sender: currentSender,
        content: currentMessage.join('\n').trim(),
        timestamp: currentTimestamp,
        metadata: { platform: this.platform }
      });
    }

    return messages;
  }

  private isSystemMessage(content: string): boolean {
    return WhatsAppConverter.SYSTEM_MESSAGES.some(msg => content.startsWith(msg));
  }
}

// Instagram message converter
class InstagramConverter extends MessageConverter {
  platform = ChatPlatform.INSTAGRAM;

  parseMessages(rawText: string): ParsedMessage[] {
    const messages: ParsedMessage[] = [];

    try {
      const jsonArray = JSON.parse(rawText);

      if (!Array.isArray(jsonArray)) {
        throw new Error('Expected JSON array');
      }

      for (const obj of jsonArray) {
        const sender = obj.sender_name || "Unknown";
        const timestampMs = obj.timestamp_ms || -1;
        const content = (obj.content || "").trim();
        const type = obj.type || "Generic";

        if (timestampMs <= 0) continue;

        const timestamp = new Date(timestampMs);

        // Handle possible system messages
        if (type !== "Generic" || this.isSystemMessage(content)) {
          messages.push({
            sender: "System",
            content: content,
            timestamp: timestamp,
            metadata: {
              platform: this.platform,
              messageType: "system",
              originalSender: sender,
              type: type
            }
          });
          continue;
        }

        if (content) {
          messages.push({
            sender: sender,
            content: content,
            timestamp: timestamp,
            metadata: { platform: this.platform }
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse Instagram messages:', error);
    }

    return messages;
  }

  private isSystemMessage(content: string): boolean {
    const systemKeywords = [
      "unsent a message",
      "missed a video call",
      "missed a call",
      "created group",
      "added you to the group"
    ];
    return systemKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}

// Telegram message converter
class TelegramConverter extends MessageConverter {
  platform = ChatPlatform.TELEGRAM;
  
  parseMessages(rawText: string): ParsedMessage[] {
    const lines = rawText.split('\n');
    const messages: ParsedMessage[] = [];
    
    // Telegram pattern: [DD.MM.YYYY HH:MM:SS] Sender: Message
    const messagePattern = /^\[(\d{2}\.\d{2}\.\d{4})\s(\d{2}:\d{2}:\d{2})\]\s(.+)$/;
    
    for (const line of lines) {
      const match = line.match(messagePattern);
      if (!match) {
        const previous = messages[messages.length - 1];
        if (previous) previous.content += "\n" + line;
        else if (line.trim()) throw new Error("Unrecognized export header; select the correct platform");
        continue;
      }
      
      const [, dateStr, timeStr, content] = match;
      
      // Parse timestamp
      const timestamp = this.parseTelegramTimestamp(dateStr, timeStr);
      if (!timestamp) continue;
      
      const colonIndex = content.indexOf(':');
      
      if (colonIndex > 0) {
        const sender = content.substring(0, colonIndex).trim();
        const messageContent = content.substring(colonIndex + 1).trim();
        
        if (messageContent) {
          messages.push({
            sender,
            content: messageContent,
            timestamp,
            metadata: { platform: this.platform }
          });
        }
      }
    }
    
    return messages;
  }

  private parseTelegramTimestamp(dateStr: string, timeStr: string): Date {
    return exportTimestamp(dateStr, timeStr, "dmy");
  }
}

// Discord message converter
class DiscordConverter extends MessageConverter {
  platform = ChatPlatform.DISCORD;
  
  parseMessages(rawText: string): ParsedMessage[] {
    const lines = rawText.split('\n');
    const messages: ParsedMessage[] = [];
    
    // Discord pattern: [DD-Mon-YY HH:MM:SS] Sender: Message
    const messagePattern = /^\[(\d{2}-\w{3}-\d{2})\s(\d{2}:\d{2}:\d{2})\]\s(.+)$/;
    
    for (const line of lines) {
      const match = line.match(messagePattern);
      if (!match) {
        const previous = messages[messages.length - 1];
        if (previous) previous.content += "\n" + line;
        else if (line.trim()) throw new Error("Unrecognized export header; select the correct platform");
        continue;
      }
      
      const [, dateStr, timeStr, content] = match;
      
      // Parse timestamp
      const timestamp = this.parseDiscordTimestamp(dateStr, timeStr);
      if (!timestamp) continue;
      
      const colonIndex = content.indexOf(':');
      
      if (colonIndex > 0) {
        const sender = content.substring(0, colonIndex).trim();
        const messageContent = content.substring(colonIndex + 1).trim();
        
        if (messageContent) {
          messages.push({
            sender,
            content: messageContent,
            timestamp,
            metadata: { platform: this.platform }
          });
        }
      }
    }
    
    return messages;
  }

  private parseDiscordTimestamp(dateStr: string, timeStr: string): Date {
    const [day, monthStr, year] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.findIndex(name => name.toLowerCase() === monthStr.toLowerCase()) + 1;
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return checkedDate(Number(year) + 2000, month, Number(day), hours, minutes, seconds);
  }
}

// Generic converter for simple formats
class GenericConverter extends MessageConverter {
  platform = ChatPlatform.GENERIC;
  
  parseMessages(rawText: string): ParsedMessage[] {
    const lines = rawText.split('\n');
    const messages: ParsedMessage[] = [];
    
    for (const line of lines) {
      // Simple format: "sender: message" or just "message"
      const colonIndex = line.indexOf(':');
      
      if (colonIndex > 0) {
        const sender = line.substring(0, colonIndex).trim();
        const content = line.substring(colonIndex + 1).trim();
        
        if (content) {
          messages.push({
            sender,
            content,
            timestamp: new Date(), // Use current time as fallback
            metadata: { platform: this.platform }
          });
        }
      } else if (line.trim()) {
        messages.push({
          sender: 'Unknown',
          content: line.trim(),
          timestamp: new Date(),
          metadata: { platform: this.platform }
        });
      }
    }
    
    return messages;
  }
}

// Converter factory
class MessageConverterFactory {
  private static converters: Map<ChatPlatform, MessageConverter> = new Map([
    [ChatPlatform.WHATSAPP, new WhatsAppConverter()],
    [ChatPlatform.INSTAGRAM, new InstagramConverter()],
    [ChatPlatform.TELEGRAM, new TelegramConverter()],
    [ChatPlatform.DISCORD, new DiscordConverter()],
    [ChatPlatform.GENERIC, new GenericConverter()]
  ]);
  
  static getConverter(platform: ChatPlatform): MessageConverter {
    const converter = this.converters.get(platform);
    if (!converter) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return converter;
  }
  
  static detectPlatform(rawText: string): ChatPlatform {
    // Auto-detect platform based on content patterns
    
    rawText = normalizeExport(rawText);
    if (rawText.split("\n").some(line => whatsappHeader.test(line))) return ChatPlatform.WHATSAPP;

    // Instagram: Try to parse as JSON array
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].sender_name) {
        return ChatPlatform.INSTAGRAM;
      }
    } catch {
      // Not valid JSON, continue with other checks
    }
    
    // Telegram pattern: [DD.MM.YYYY HH:MM:SS] 
    if (/\[\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}:\d{2}\]/.test(rawText)) {
      return ChatPlatform.TELEGRAM;
    }
    
    // Discord pattern: [DD-Mon-YY HH:MM:SS]
    if (/\[\d{2}-\w{3}-\d{2}\s\d{2}:\d{2}:\d{2}\]/.test(rawText)) {
      return ChatPlatform.DISCORD;
    }
    
    // Automatic generic detection is limited to explicit sender: text lines.
    // Timestamp-like unknown exports must never become import-time messages.
    if (rawText.trim() && rawText.split("\n").filter(line => line.trim()).every(line => /^[^\d\[\]{}:][^:]{0,119}:\s*\S/.test(line))) return ChatPlatform.GENERIC;

    throw new Error("Platform couldn't be identified");
  }
  
  static convertMessages(
    rawText: string, 
    platform?: ChatPlatform,
    options?: ExportParseOptions
  ): Omit<Message, 'id' | 'chatId' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
    const detectedPlatform = platform || this.detectPlatform(rawText);
    const converter = this.getConverter(detectedPlatform);
    const parsedMessages = converter.parseMessages(normalizeExport(rawText), options);
    for (const [index, message] of parsedMessages.entries()) {
      if (message.content.length > 20000) throw new Error(`Message ${index + 1} exceeds 20,000 characters; shorten it before importing`);
    }
    if (!parsedMessages.length) throw new Error("No messages recognized; check the platform and export format");
    return converter.convertToMessages(parsedMessages);
  }

  static generateChatTitle(platform: ChatPlatform, messages: Omit<Message, 'id' | 'chatId' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]): string {
    let platformName = "";
    switch (platform) {
        case ChatPlatform.WHATSAPP: platformName = "WhatsApp"; break;
        case ChatPlatform.INSTAGRAM: platformName = "Instagram"; break;
        case ChatPlatform.TELEGRAM: platformName = "Telegram"; break;
        case ChatPlatform.DISCORD: platformName = "Discord"; break;
        case ChatPlatform.GENERIC: platformName = "Chat"; break;
    }

    const participants = [...new Set(
        messages
            .map(m => m.sender)
            .filter(s => s !== "System" && s !== "Unknown")
    )];

    let participantsStr = "Unknown";
    if (participants.length > 0) {
        const firstTwo = participants.slice(0, 2).join(" & ");
        const remaining = participants.length > 2 ? ` +${participants.length - 2}` : "";
        participantsStr = `${firstTwo}${remaining}`;
    }

    return `${platformName}: ${participantsStr}`;
  }
}

// Export the factory
export default MessageConverterFactory;

// Utility function for easy usage
export function convertChatExport(
  rawText: string,
  platform?: ChatPlatform,
  options?: ExportParseOptions
): { 
    messages: Omit<Message, 'id' | 'chatId' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[],
    title: string,
    platform: ChatPlatform
} {
  const detectedPlatform = platform || MessageConverterFactory.detectPlatform(rawText);
  const messages = MessageConverterFactory.convertMessages(rawText, detectedPlatform, options);
  const title = MessageConverterFactory.generateChatTitle(detectedPlatform, messages);
  
  return { messages, title, platform: detectedPlatform };
}