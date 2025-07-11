import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { X } from "lucide-react";
import { convertChatExport, ChatPlatform } from "@/utils/messageConverter";

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
  onShowToast
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
          <DialogDescription className="text-white/60">
            Upload your conversation for analysis
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
              variant={importMode === "manual" ? "default" : "outline"}
              onClick={() => onImportModeChange("manual")}
              className="flex-1"
            >
              Manual Entry
            </Button>
            <Button
              variant={importMode === "whatsapp" ? "default" : "outline"}
              onClick={() => onImportModeChange("whatsapp")}
              className="flex-1"
            >
              WhatsApp Import
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
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreateChat}
            disabled={!chatTitle.trim() || isCreating}
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                <span>Creating...</span>
              </div>
            ) : (
              "Create Chat"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 