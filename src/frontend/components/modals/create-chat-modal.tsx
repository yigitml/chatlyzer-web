import { Message } from "@prisma/client";

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

// Abstract base converter class
abstract class MessageConverter {
  abstract platform: ChatPlatform;
  abstract parseMessages(rawText: string): ParsedMessage[];
  
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

  // WhatsApp date+time formats for exported messages
  // Old format: 31.12.23, 23:59 - Sender: Message
  private static readonly MESSAGE_HEADER_OLD = /^(\d{1,2}\.\d{1,2}\.\d{2,4}), (\d{2}:\d{2}) - (.*)$/;
  // New format: [31.12.2023, 23:59:59] Sender: Message
  private static readonly MESSAGE_HEADER_NEW = /^\[(\d{1,2}\.\d{1,2}\.\d{4}), (\d{2}:\d{2}:\d{2})\] (.*)$/;

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

  parseMessages(rawText: string): ParsedMessage[] {
    const lines = rawText.split('\n');
    const messages: ParsedMessage[] = [];
    let currentMessage: string[] | null = null;
    let currentSender: string | null = null;
    let currentTimestamp: Date | null = null;

    for (const line of lines) {
      // Try both WhatsApp formats
      let match = line.match(WhatsAppConverter.MESSAGE_HEADER_NEW);
      let isNewFormat = true;
      
      if (!match) {
        match = line.match(WhatsAppConverter.MESSAGE_HEADER_OLD);
        isNewFormat = false;
      }

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
        const timestamp = this.parseTimestamp(dateStr, timeStr, isNewFormat);
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

  private parseTimestamp(dateStr: string, timeStr: string, hasSeconds: boolean = false): Date | null {
    try {
      // Parse based on the format pattern
      const [day, month, year] = dateStr.split('.');
      const timeParts = timeStr.split(':');
      const hours = timeParts[0];
      const minutes = timeParts[1];
      const seconds = hasSeconds && timeParts.length > 2 ? timeParts[2] : '0';
      
      let fullYear: number;
      if (year.length === 2) {
        const yearNum = parseInt(year);
        // Assume 20xx for years 00-50, 19xx for years 51-99
        fullYear = yearNum <= 50 ? 2000 + yearNum : 1900 + yearNum;
      } else {
        fullYear = parseInt(year);
      }

      const date = new Date(
        fullYear,
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );

      // Validate the date
      if (isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch (error) {
      console.warn('Failed to parse WhatsApp timestamp:', dateStr, timeStr, error);
      return null;
    }
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
    const lines = rawText.split('\n').filter(line => line.trim());
    const messages: ParsedMessage[] = [];
    
    // Telegram pattern: [DD.MM.YYYY HH:MM:SS] Sender: Message
    const messagePattern = /^\[(\d{2}\.\d{2}\.\d{4})\s(\d{2}:\d{2}:\d{2})\]\s(.+)$/;
    
    for (const line of lines) {
      const match = line.match(messagePattern);
      if (!match) continue;
      
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

  private parseTelegramTimestamp(dateStr: string, timeStr: string): Date | null {
    try {
      const [day, month, year] = dateStr.split('.');
      const [hours, minutes, seconds] = timeStr.split(':');
      
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );
    } catch (error) {
      console.warn('Failed to parse Telegram timestamp:', dateStr, timeStr, error);
      return null;
    }
  }
}

// Discord message converter
class DiscordConverter extends MessageConverter {
  platform = ChatPlatform.DISCORD;
  
  parseMessages(rawText: string): ParsedMessage[] {
    const lines = rawText.split('\n').filter(line => line.trim());
    const messages: ParsedMessage[] = [];
    
    // Discord pattern: [DD-Mon-YY HH:MM:SS] Sender: Message
    const messagePattern = /^\[(\d{2}-\w{3}-\d{2})\s(\d{2}:\d{2}:\d{2})\]\s(.+)$/;
    
    for (const line of lines) {
      const match = line.match(messagePattern);
      if (!match) continue;
      
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

  private parseDiscordTimestamp(dateStr: string, timeStr: string): Date | null {
    try {
      // Parse format like "31-Dec-23"
      const [day, monthStr, year] = dateStr.split('-');
      const [hours, minutes, seconds] = timeStr.split(':');
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(monthStr);
      
      if (monthIndex === -1) return null;
      
      const fullYear = parseInt(year) + 2000; // Assuming 20xx
      
      return new Date(
        fullYear,
        monthIndex,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );
    } catch (error) {
      console.warn('Failed to parse Discord timestamp:', dateStr, timeStr, error);
      return null;
    }
  }
}

// Generic converter for simple formats
class GenericConverter extends MessageConverter {
  platform = ChatPlatform.GENERIC;
  
  parseMessages(rawText: string): ParsedMessage[] {
    const lines = rawText.split('\n').filter(line => line.trim());
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
    
    // WhatsApp patterns: 
    // Old format: DD.MM.YY, HH:MM - 
    // New format: [DD.MM.YYYY, HH:MM:SS] 
    if (/\d{1,2}\.\d{1,2}\.\d{2,4},\s\d{2}:\d{2}\s-\s/.test(rawText) || 
        /\[\d{1,2}\.\d{1,2}\.\d{4},\s\d{2}:\d{2}:\d{2}\]/.test(rawText)) {
      return ChatPlatform.WHATSAPP;
    }
    
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
    
    // Default to Generic if nothing else matches but there is content
    if (rawText.trim().length > 0) {
        return ChatPlatform.GENERIC;
    }
    
    throw new Error("Platform couldn't be identified");
  }
  
  static convertMessages(
    rawText: string, 
    platform?: ChatPlatform
  ): Omit<Message, 'id' | 'chatId' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
    const detectedPlatform = platform || this.detectPlatform(rawText);
    const converter = this.getConverter(detectedPlatform);
    const parsedMessages = converter.parseMessages(rawText);
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
  platform?: ChatPlatform
): { 
    messages: Omit<Message, 'id' | 'chatId' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[],
    title: string,
    platform: ChatPlatform
} {
  const detectedPlatform = platform || MessageConverterFactory.detectPlatform(rawText);
  const messages = MessageConverterFactory.convertMessages(rawText, detectedPlatform);
  const title = MessageConverterFactory.generateChatTitle(detectedPlatform, messages);
  
  return { messages, title, platform: detectedPlatform };
}