import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";
import { Input } from "@/frontend/components/ui/input";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Button } from "@/frontend/components/ui/button";
import { Label } from "@/frontend/components/ui/label";
import { LoadingSpinner } from "@/frontend/components/common/loading-spinner";
import { X, Shield, EyeOff } from "lucide-react";
import { convertChatExport, ChatPlatform } from "@/shared/utils/messageConverter";

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
  importMode: "manual" | "whatsapp";
  onImportModeChange: (mode: "manual" | "whatsapp") => void;
  onShowToast: (message: string, type: "success" | "error") => void;
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
  importMode,
  onImportModeChange,
  onShowToast,
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

  const handleImportModeChange = (mode: "manual" | "whatsapp") => {
    onImportModeChange(mode);
    
    // Clear messages and WhatsApp text when switching to manual mode
    if (mode === "manual") {
      onMessagesChange([]);
      onWhatsappImportTextChange("");
    }
  };

  const handlePrivacyToggle = (enabled: boolean) => {
    onTogglePrivacyMode(enabled);
    // If disabling privacy and ghost mode is on, disable ghost mode too
    if (!enabled && isGhostMode) {
      onToggleGhostMode(false);
    }
  };

  const handleGhostToggle = (enabled: boolean) => {
    onToggleGhostMode(enabled);
    // If enabling ghost mode, also enable privacy mode
    if (enabled && !isPrivacyMode) {
      onTogglePrivacyMode(true);
    }
  };

  const handleClose = () => {
    // Clear all state when closing the modal
    onMessagesChange([]);
    onWhatsappImportTextChange("");
    onNewMessageSenderChange("");
    onNewMessageContentChange("");
    onImportModeChange("whatsapp"); // Default to WhatsApp import
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
          {/* Privacy Settings */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-white">Privacy Settings</h3>
            
            {/* Privacy Analysis Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <div>
                  <span className="text-sm text-white">Privacy Analysis</span>
                  <p className="text-xs text-white/60">Messages analyzed but not stored</p>
                </div>
              </div>
              <button
                onClick={() => handlePrivacyToggle(!isPrivacyMode)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isPrivacyMode ? 'bg-green-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    isPrivacyMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Ghost Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-sm text-white">Ghost Mode</span>
                  <p className="text-xs text-white/60">No data saved - completely private</p>
                </div>
              </div>
              <button
                onClick={() => handleGhostToggle(!isGhostMode)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isGhostMode ? 'bg-purple-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    isGhostMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Status indicator */}
            {(isPrivacyMode || isGhostMode) && (
              <div className={`text-xs p-2 rounded ${
                isGhostMode 
                  ? 'bg-purple-900/20 text-purple-300 border border-purple-500/30' 
                  : 'bg-green-900/20 text-green-300 border border-green-500/30'
              }`}>
                {isGhostMode 
                  ? "👻 Ghost Mode: Analysis will be performed but no data will be saved to your account"
                  : "🔒 Privacy Mode: Messages will be analyzed but not stored in your chat history"
                }
              </div>
            )}
          </div>

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
              variant={importMode === "whatsapp" ? "default" : "outline"}
              onClick={() => handleImportModeChange("whatsapp")}
              className="flex-1"
            >
              WhatsApp Import
            </Button>
            <Button
              variant={importMode === "manual" ? "default" : "outline"}
              onClick={() => handleImportModeChange("manual")}
              className="flex-1"
            >
              Manual Entry
            </Button>
          </div>

          {importMode === "whatsapp" ? (
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
          ) : (
            <div>
              <Label>Messages (Optional)</Label>
              {chatMessages.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto mt-2">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-300">{msg.sender}</p>
                        <p className="text-sm text-white/80 truncate">{msg.content}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMessage(i)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Input
                  placeholder="Sender..."
                  value={newMessageSender}
                  onChange={(e) => onNewMessageSenderChange(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
                <Input
                  placeholder="Message..."
                  value={newMessageContent}
                  onChange={(e) => onNewMessageContentChange(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <Button
                onClick={addMessage}
                disabled={!newMessageSender.trim() || !newMessageContent.trim()}
                variant="outline"
                className="w-full mt-2"
              >
                Add Message
              </Button>
            </div>
          )}
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