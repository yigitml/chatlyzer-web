import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";
import { Input } from "@/frontend/components/ui/input";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Button } from "@/frontend/components/ui/button";
import { Label } from "@/frontend/components/ui/label";
import { LoadingSpinner } from "@/frontend/components/common/loading-spinner";
import { X, Shield, EyeOff } from "lucide-react";
import { convertChatExport, ChatPlatform } from "@/shared/utils/messageConverter";
import { ImportMode } from "@/shared/types/app";

interface Message {
  sender: string;
  content: string;
  timestamp?: Date;
}

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: () => void;
  isCreating: boolean;
  chatTitle: string;
  onTitleChange: (title: string) => void;
  chatMessages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  newMessageSender: string;
  onNewMessageSenderChange: (sender: string) => void;
  newMessageContent: string;
  onNewMessageContentChange: (content: string) => void;
  whatsappImportText: string;
  onWhatsappImportTextChange: (text: string) => void;
  onShowToast: (message: string, type: "success" | "error") => void;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  // New props for privacy settings
  isPrivacyMode: boolean;
  isGhostMode: boolean;
  onTogglePrivacyMode: (enabled: boolean) => void;
  onToggleGhostMode: (enabled: boolean) => void;
}

export const CreateChatModal = ({
  isOpen,
  onClose,
  onCreateChat,
  isCreating,
  chatTitle,
  onTitleChange,
  chatMessages,
  onMessagesChange,
  newMessageSender,
  onNewMessageSenderChange,
  newMessageContent,
  onNewMessageContentChange,
  whatsappImportText,
  onWhatsappImportTextChange,
  onShowToast,
  importMode,
  onImportModeChange,
  isPrivacyMode,
  isGhostMode,
  onTogglePrivacyMode,
  onToggleGhostMode
}: CreateChatModalProps) => {
  const addMessage = () => {
    if (!newMessageSender.trim() || !newMessageContent.trim()) return;
    
    const newMessage: Message = {
      sender: newMessageSender.trim(),
      content: newMessageContent.trim(),
      timestamp: new Date()
    };
    
    onMessagesChange([...chatMessages, newMessage]);
    onNewMessageSenderChange("");
    onNewMessageContentChange("");
  };

  const removeMessage = (index: number) => {
    onMessagesChange(chatMessages.filter((_, i) => i !== index));
  };

  const handleWhatsAppImport = () => {
    if (!whatsappImportText.trim()) {
      onShowToast("Please paste WhatsApp chat export", "error");
      return;
    }

    try {
      const convertedMessages = convertChatExport(whatsappImportText, ChatPlatform.WHATSAPP);
      
      if (convertedMessages.length === 0) {
        onShowToast("No valid messages found", "error");
        return;
      }

      const formattedMessages = convertedMessages.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      onMessagesChange(formattedMessages);
      
      const participants = [...new Set(formattedMessages.map(msg => msg.sender))];
      const autoTitle = `WhatsApp: ${participants.slice(0, 2).join(" & ")}${participants.length > 2 ? ` +${participants.length - 2}` : ""}`;
      onTitleChange(autoTitle);
      
      onShowToast(`Imported ${convertedMessages.length} messages 🎉`, "success");
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : "Failed to parse WhatsApp export", "error");
    }
  };

  const handlePrivacyToggle = (enabled: boolean) => {
    onTogglePrivacyMode(enabled);
    // If enabling privacy mode, ensure ghost mode is off
    if (enabled) {
      onToggleGhostMode(false);
    }
  };

  const handleGhostToggle = (enabled: boolean) => {
    onToggleGhostMode(enabled);
    // If enabling ghost mode, also enable privacy mode
    if (enabled) {
      onTogglePrivacyMode(true);
    }
  };

  const handleClose = () => {
    // Clear all state when closing the modal
    onMessagesChange([]);
    onWhatsappImportTextChange("");
    onNewMessageSenderChange("");
    onNewMessageContentChange("");
    onTogglePrivacyMode(true); // Default to Privacy Mode
    onToggleGhostMode(false); // Ensure Ghost Mode is off
    onClose();
  };

  const getButtonText = () => {
    if (isGhostMode) {
      return isCreating ? "Creating Ghost Analysis..." : "Create Ghost Analysis";
    } else if (isPrivacyMode) {
      return isCreating ? "Creating Privacy Analysis..." : "Create Privacy Analysis";
    } else {
      return isCreating ? "Creating Chat..." : "Create Chat";
    }
  };

  const getModalDescription = () => {
    if (isGhostMode) {
      return "Create a completely private analysis - no data will be saved";
    } else if (isPrivacyMode) {
      return "Create a privacy analysis - messages will be analyzed but not stored";
    } else {
      return "Upload your conversation for analysis";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-black border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
          <DialogDescription className="text-white/60">
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="title">Chat Title</Label>
            <Input
              id="title"
              value={chatTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Give this chat a name..."
              className="bg-white/10 border-white/20 text-white mt-2"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={!isPrivacyMode && !isGhostMode ? "default" : "outline"}
              onClick={() => { onTogglePrivacyMode(false); onToggleGhostMode(false); }}
              className="flex-1"
            >
              Normal Analysis
            </Button>
            <Button
              variant={isPrivacyMode && !isGhostMode ? "default" : "outline"}
              onClick={() => handlePrivacyToggle(true)}
              className={`flex-1 ${isPrivacyMode && !isGhostMode ? 'border-2 border-green-500' : ''}`}
            >
              Privacy Mode
            </Button>
            <Button
              variant={isGhostMode ? "default" : "outline"}
              onClick={() => handleGhostToggle(true)}
              className={`flex-1 ${isGhostMode ? 'border-2 border-purple-500' : ''}`}
            >
              Ghost Mode
            </Button>
          </div>

            <div>
              <Label>WhatsApp Export</Label>
              <Textarea
                value={whatsappImportText}
                onChange={(e) => onWhatsappImportTextChange(e.target.value)}
                placeholder="Paste your WhatsApp chat export here..."
                rows={6}
                className="bg-white/10 border-white/20 text-white font-mono text-sm mt-2"
              />
              <Button
                onClick={handleWhatsAppImport}
                disabled={!whatsappImportText.trim()}
                className="w-full mt-3"
              >
                Parse Export
              </Button>
            </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreateChat}
            disabled={!chatTitle.trim() || isCreating}
            className={isGhostMode ? 'bg-purple-600 hover:bg-purple-700' : isPrivacyMode ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                <span>{getButtonText()}</span>
              </div>
            ) : (
              getButtonText()
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 