"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/frontend/components/ui/dialog";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Label } from "@/frontend/components/ui/label";
import { LoadingSpinner } from "@/frontend/components/common/loading-spinner";
import { Shield, Trash2 } from "lucide-react";
import { convertChatExport, ChatPlatform } from "@/shared/utils/messageConverter";

interface Message {
  sender: string;
  content: string;
  timestamp?: Date;
}

interface CreatePrivacyAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePrivacyAnalysis: () => void;
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

export const CreatePrivacyAnalysisModal = ({
  isOpen,
  onClose,
  onCreatePrivacyAnalysis,
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
}: CreatePrivacyAnalysisModalProps) => {
  const addMessage = () => {
    if (!newMessageSender.trim() || !newMessageContent.trim()) {
      onShowToast("Both sender and content are required", "error");
      return;
    }

    const newMessage: Message = {
      sender: newMessageSender.trim(),
      content: newMessageContent.trim(),
      timestamp: new Date(),
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

  const handleClose = () => {
    // Clear all state when closing the modal
    onMessagesChange([]);
    onWhatsappImportTextChange("");
    onNewMessageSenderChange("");
    onNewMessageContentChange("");
    onImportModeChange("manual");
    onClose();
  };

  const canCreateAnalysis = chatTitle.trim() && chatMessages.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-black border-white/20 text-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <DialogTitle>Create Privacy Analysis</DialogTitle>
          </div>
          <DialogDescription className="text-white/60">
            Analyze your conversation privately - messages never stored
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <h3 className="text-green-400 font-semibold text-sm">Privacy Mode</h3>
            </div>
            <p className="text-green-300 text-sm">
              Your messages will be analyzed but <strong>never stored</strong> in our database. 
              Only the analysis results and chat title will be saved for your reference.
            </p>
          </div>

          <div>
            <Label htmlFor="title">Analysis Title</Label>
            <Input
              id="title"
              value={chatTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g., Private Chat Analysis"
              className="bg-white/10 border-white/20 text-white mt-2"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={importMode === "manual" ? "default" : "outline"}
              onClick={() => handleImportModeChange("manual")}
              className="flex-1"
            >
              Manual Entry
            </Button>
            <Button
              variant={importMode === "whatsapp" ? "default" : "outline"}
              onClick={() => handleImportModeChange("whatsapp")}
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
                  {chatMessages.map((message, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-300">{message.sender}</p>
                        <p className="text-sm text-white/80 truncate">{message.content}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMessage(index)}
                      >
                        <Trash2 className="w-3 h-3" />
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
            onClick={onCreatePrivacyAnalysis}
            disabled={!canCreateAnalysis || isCreating}
            className="bg-white/5 hover:bg-white/10 text-green-400 border border-green-400/30"
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Create Privacy Analysis (8 credits)</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 