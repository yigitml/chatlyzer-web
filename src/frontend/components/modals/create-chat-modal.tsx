import {
  availableCredits,
  canFundAnalysis,
  sandboxBilling,
} from "@/frontend/lib/creditBalance";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog";
import { Input } from "@/frontend/components/ui/input";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Button } from "@/frontend/components/ui/button";
import { Label } from "@/frontend/components/ui/label";
import { LoadingSpinner } from "@/frontend/components/common/loading-spinner";
import {
  convertChatExport,
  ChatPlatform,
} from "@/shared/utils/messageConverter";
import { ImportMode } from "@/shared/types/app";
import { useCreditStore } from "@/frontend/store/creditStore";
import { BuyCreditsButton } from "@/frontend/components/common/buy-credits-button";

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
  canRecoverPrivacyRequest?: boolean;
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
  canRecoverPrivacyRequest = false,
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
  onToggleGhostMode,
}: CreateChatModalProps) => {
  const [dateOrder, setDateOrder] = useState<"dmy" | "mdy">("dmy");
  const credits = useCreditStore((s) => s.credits);
  const totalCredits = availableCredits(credits);

  const handleWhatsAppImport = () => {
    if (!whatsappImportText.trim()) {
      onShowToast("Please paste the chat export", "error");
      return;
    }

    try {
      const { messages, title } = convertChatExport(
        whatsappImportText,
        importMode as unknown as ChatPlatform,
        { dateOrder },
      );

      if (messages.length === 0) {
        onShowToast("No valid messages found", "error");
        return;
      }

      const formattedMessages = messages.map((msg) => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
      }));

      onMessagesChange(formattedMessages);
      if (!chatTitle.trim()) onTitleChange(title);

      onShowToast(`Imported ${messages.length} messages 🎉`, "success");
    } catch (error) {
      onShowToast(
        error instanceof Error ? error.message : "Failed to parse export",
        "error",
      );
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
    if (canRecoverPrivacyRequest)
      return isCreating
        ? "Checking analysis..."
        : "Check / retry existing request";
    if (isGhostMode) {
      return isCreating
        ? "Creating Ghost Analysis..."
        : "Create Ghost Analysis";
    } else if (isPrivacyMode) {
      return isCreating
        ? "Creating Privacy Analysis..."
        : "Create Privacy Analysis";
    } else {
      return isCreating ? "Creating Chat..." : "Create Chat";
    }
  };

  const getModalDescription = () => {
    if (isGhostMode) {
      return "Conversation content and analysis results are not saved";
    } else if (isPrivacyMode) {
      return "Create a privacy analysis - messages will be analyzed but not stored";
    } else {
      return "Upload your conversation for analysis";
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isCreating) handleClose();
      }}
    >
      <DialogContent className="ph-no-capture ph-mask sm:max-w-[600px] max-h-[90dvh] overflow-y-auto bg-black border-white/20 text-white">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant={!isPrivacyMode && !isGhostMode ? "default" : "outline"}
              onClick={() => {
                onTogglePrivacyMode(false);
                onToggleGhostMode(false);
              }}
              className="flex-1"
            >
              Normal Analysis
            </Button>
            <Button
              variant={isPrivacyMode && !isGhostMode ? "default" : "outline"}
              onClick={() => handlePrivacyToggle(true)}
              className={`flex-1 ${isPrivacyMode && !isGhostMode ? "border-2 border-green-500" : ""}`}
            >
              Privacy Mode
            </Button>
            <Button
              variant={isGhostMode ? "default" : "outline"}
              onClick={() => handleGhostToggle(true)}
              className={`flex-1 ${isGhostMode ? "border-2 border-purple-500" : ""}`}
            >
              Ghost Mode
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-white/60">
            Chat content is sent to our AI provider for analysis. Privacy Mode
            avoids storing raw messages; Ghost Mode avoids saving the chat and
            analysis results after the response.
          </p>

          <div className="space-y-2">
            <Label htmlFor="import-platform">Input format</Label>
            <select
              id="import-platform"
              value={importMode}
              onChange={(event) => {
                onImportModeChange(event.target.value as ImportMode);
              }}
              className="w-full border p-2 bg-black text-white"
            >
              <option value={ImportMode.WHATSAPP}>WhatsApp text export</option>
              <option value={ImportMode.TELEGRAM}>Telegram text export</option>
              <option value={ImportMode.DISCORD}>Discord text export</option>
              <option value={ImportMode.MANUAL}>Manual messages</option>
            </select>
          </div>
          {importMode === ImportMode.MANUAL ? (
            <div className="space-y-3">
              <Label htmlFor="message-sender">Sender</Label>
              <Input
                id="message-sender"
                value={newMessageSender}
                onChange={(e) => onNewMessageSenderChange(e.target.value)}
              />
              <Label htmlFor="message-content">Message</Label>
              <Textarea
                id="message-content"
                value={newMessageContent}
                onChange={(e) => onNewMessageContentChange(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!newMessageSender.trim() || !newMessageContent.trim()}
                onClick={() => {
                  onMessagesChange([
                    ...chatMessages,
                    {
                      sender: newMessageSender.trim(),
                      content: newMessageContent.trim(),
                      timestamp: new Date(),
                    },
                  ]);
                  onNewMessageContentChange("");
                }}
              >
                Add Message
              </Button>
              <ol className="max-h-36 overflow-auto space-y-2">
                {chatMessages.map((message, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="flex-1 break-words">
                      {message.sender}: {message.content}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Remove message ${index + 1}`}
                      onClick={() =>
                        onMessagesChange(
                          chatMessages.filter((_, item) => item !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div>
              <Label htmlFor="export-text">Conversation export</Label>
              <p className="text-xs text-white/60 mt-2">
                {importMode === ImportMode.TELEGRAM
                  ? "Text format: [30.09.2026 12:00:00] Sender: Message"
                  : importMode === ImportMode.DISCORD
                    ? "Text format: [30-Sep-26 12:00:00] Sender: Message"
                    : "Paste a WhatsApp text export; continuation lines are preserved."}
              </p>
              <Textarea
                id="export-text"
                value={whatsappImportText}
                onChange={(e) => onWhatsappImportTextChange(e.target.value)}
                rows={6}
                className="mt-2 font-mono text-sm"
              />
              {importMode === ImportMode.WHATSAPP && (
                <div className="mt-3">
                  <Label htmlFor="date-order">Export date order</Label>
                  <select
                    id="date-order"
                    value={dateOrder}
                    onChange={(e) =>
                      setDateOrder(e.target.value as "dmy" | "mdy")
                    }
                    className="w-full bg-black border p-2 mt-2"
                  >
                    <option value="dmy">Day / month / year</option>
                    <option value="mdy">Month / day / year</option>
                  </select>
                </div>
              )}
              <Button
                onClick={handleWhatsAppImport}
                disabled={!whatsappImportText.trim()}
                className="w-full mt-3"
              >
                Parse Export
              </Button>
            </div>
          )}
          {sandboxBilling(credits) && (
            <p className="text-sm text-amber-300">
              Test billing mode: sandbox credits are isolated from paid credits.
            </p>
          )}
          <p className="text-sm text-white/60">
            Available credits: {totalCredits}. Each analysis requires 8 credits
            from one pool; paid and test credits cannot be combined.
          </p>
          <p role="status" className="text-sm text-white/60">
            {chatMessages.length} messages ready
          </p>
        </div>

        <DialogFooter className="flex items-center gap-2">
          {(isPrivacyMode || isGhostMode) && !canFundAnalysis(credits) && (
            <div className="flex-1">
              <BuyCreditsButton className="w-full" />
            </div>
          )}
          <Button variant="outline" disabled={isCreating} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={onCreateChat}
            disabled={
              !chatTitle.trim() ||
              isCreating ||
              ((isPrivacyMode || isGhostMode) &&
                ((!canFundAnalysis(credits) && !canRecoverPrivacyRequest) ||
                  chatMessages.length === 0))
            }
            className={
              isGhostMode
                ? "bg-purple-600 hover:bg-purple-700"
                : isPrivacyMode
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
            }
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
