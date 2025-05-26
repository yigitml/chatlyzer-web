import { Message } from "@prisma/client";

// Types for parsed messages (before conversion to full Message objects)
export interface ParsedMessage {
  sender: string;
  content: string;
  timestamp: Date;
  metadata?: any;
}

// Supported chat platforms
export enum ChatPlatform {
  WHATSAPP = 'whatsapp',
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

  parseMessages(rawText: string): ParsedMessage[] {
    const lines = rawText.split('\n').filter(line => line.trim());
    const messages: ParsedMessage[] = [];
    
    // WhatsApp pattern: DD.MM.YY, HH:MM - sender: message
    // or DD.MM.YY, HH:MM - system message
    const messagePattern = /^(\d{2}\.\d{2}\.\d{2}),\s(\d{2}:\d{2})\s-\s(.+)$/;
    
    for (const line of lines) {
      const match = line.match(messagePattern);
      if (!match) continue;
      
      const [, dateStr, timeStr, content] = match;
      
      // Parse timestamp
      const timestamp = this.parseWhatsAppTimestamp(dateStr, timeStr);
      if (!timestamp) continue;
      
      // Check if it's a user message (contains colon) or system message
      const colonIndex = content.indexOf(':');
      
      if (colonIndex > 0 && colonIndex < content.length - 1) {
        // User message: "sender: message"
        const sender = content.substring(0, colonIndex).trim();
        const messageContent = content.substring(colonIndex + 1).trim();
        
        // Skip empty messages or media placeholders
        if (!messageContent || this.isMediaPlaceholder(messageContent)) {
          continue;
        }
        
        messages.push({
          sender,
          content: messageContent,
          timestamp,
          metadata: {
            platform: this.platform,
            originalLine: line
          }
        });
      } else {
        // System message
        if (!this.isSystemMessage(content)) {
          // If it's not a recognized system message, treat as unknown sender
          messages.push({
            sender: 'System',
            content: content.trim(),
            timestamp,
            metadata: {
              platform: this.platform,
              messageType: 'system',
              originalLine: line
            }
          });
        }
      }
    }
    
    return messages;
  }
  
  private parseWhatsAppTimestamp(dateStr: string, timeStr: string): Date | null {
    try {
      // Convert DD.MM.YY to YYYY-MM-DD
      const [day, month, year] = dateStr.split('.');
      const fullYear = `20${year}`; // Assuming 2000s
      const [hours, minutes] = timeStr.split(':');
      
      return new Date(
        parseInt(fullYear),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
    } catch (error) {
      console.warn('Failed to parse WhatsApp timestamp:', dateStr, timeStr, error);
      return null;
    }
  }
  
  private isMediaPlaceholder(content: string): boolean {
    const mediaPlaceholders = [
      '<Medien ausgeschlossen>', // German: Media omitted
      '<Media omitted>',
      '<media omitted>',
      '<attached:',
      '<image omitted>',
      '<video omitted>',
      '<audio omitted>',
      '<document omitted>'
    ];
    
    return mediaPlaceholders.some(placeholder => 
      content.toLowerCase().includes(placeholder.toLowerCase())
    );
  }
  
  private isSystemMessage(content: string): boolean {
    const systemMessagePatterns = [
      /verschlüsselt/i, // German encryption message
      /ende-zu-ende/i,
      /encrypted/i,
      /security code changed/i,
      /joined using this group/i,
      /left/i,
      /created group/i,
      /changed the group/i,
      /added/i,
      /removed/i
    ];
    
    return systemMessagePatterns.some(pattern => pattern.test(content));
  }
}

// Telegram message converter (example structure)
class TelegramConverter extends MessageConverter {
  platform = ChatPlatform.TELEGRAM;
  
  parseMessages(rawText: string): ParsedMessage[] {
    // Implement Telegram-specific parsing logic
    // This would depend on Telegram's export format
    return [];
  }
}

// Discord message converter (example structure)
class DiscordConverter extends MessageConverter {
  platform = ChatPlatform.DISCORD;
  
  parseMessages(rawText: string): ParsedMessage[] {
    // Implement Discord-specific parsing logic
    // This would depend on Discord's export format
    return [];
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
            metadata: {
              platform: this.platform,
              originalLine: line
            }
          });
        }
      } else if (line.trim()) {
        messages.push({
          sender: 'Unknown',
          content: line.trim(),
          timestamp: new Date(),
          metadata: {
            platform: this.platform,
            originalLine: line
          }
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
    
    // WhatsApp pattern: DD.MM.YY, HH:MM - 
    if (/\d{2}\.\d{2}\.\d{2},\s\d{2}:\d{2}\s-\s/.test(rawText)) {
      return ChatPlatform.WHATSAPP;
    }
    
    // Add more detection patterns for other platforms
    // Telegram pattern: [DD.MM.YYYY HH:MM:SS] 
    if (/\[\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}:\d{2}\]/.test(rawText)) {
      return ChatPlatform.TELEGRAM;
    }
    
    // Discord pattern: [DD-Mon-YY HH:MM:SS]
    if (/\[\d{2}-\w{3}-\d{2}\s\d{2}:\d{2}:\d{2}\]/.test(rawText)) {
      return ChatPlatform.DISCORD;
    }
    
    return ChatPlatform.GENERIC;
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
}

// Export the factory
export default MessageConverterFactory;

// Utility function for easy usage
export function convertChatExport(
  rawText: string,
  platform?: ChatPlatform
): Omit<Message, 'id' | 'chatId' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] {
  return MessageConverterFactory.convertMessages(rawText, platform);
}

// Example usage:
// const messages = convertChatExport(whatsappExportText, ChatPlatform.WHATSAPP);
// const autoDetectedMessages = convertChatExport(someExportText); // Auto-detect platform 