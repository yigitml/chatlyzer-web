import { useState } from "react";
import { useChatStore } from "@/frontend/store/chatStore";
import { useAnalysisManagement } from "@/frontend/hooks/use-analysis-management";
import { ChatPostRequest, ChatDeleteRequest, PrivacyAnalysisPostRequest } from "@/shared/types/api/apiRequest";
import { setStorageItem, LOCAL_STORAGE_KEYS } from "@/shared/utils/storage";

interface Message {
  sender: string;
  content: string;
  timestamp?: Date;
}

export const useChatManagement = () => {
  const { chats, createChat, updateChat, deleteChat, fetchChats } = useChatStore();
  const { handlePrivacyAnalysis, isGhostMode, isPrivacyMode } = useAnalysisManagement();
  
  // Chat Selection State
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  
  // Chat Editing State
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  
  // Delete Chat State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  
  // Create Chat Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  
  // Message entry state (shared between all modals)
  const [newMessageSender, setNewMessageSender] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [whatsappImportText, setWhatsappImportText] = useState("");
  const [importMode, setImportMode] = useState<"manual" | "whatsapp">("whatsapp"); // Default to WhatsApp

  // Helper function to select chat with storage update
  const selectChat = (chatId: string | null) => {
    setSelectedChatId(chatId);
    if (chatId) {
      setStorageItem(LOCAL_STORAGE_KEYS.SELECTED_CHAT_ID, chatId);
    }
  };

  const handleCreateChat = async (showToast: (message: string, type: "success" | "error") => void) => {
    if (!chatTitle.trim()) {
      showToast("Chat title is required bestie", "error");
      return;
    }

    try {
      setIsCreatingChat(true);

      // If privacy mode or ghost mode is enabled, create privacy analysis instead
      if (isPrivacyMode || isGhostMode) {
        if (chatMessages.length === 0) {
          showToast("At least one message is required for analysis", "error");
          return;
        }

        const analysisData: PrivacyAnalysisPostRequest = {
          title: chatTitle.trim(),
          isGhostMode: isGhostMode,
          messages: chatMessages.map(msg => ({
            sender: msg.sender,
            content: msg.content,
            timestamp: msg.timestamp || new Date(),
            metadata: null
          }))
        };

        const result = await handlePrivacyAnalysis(analysisData, showToast);
        
        if (result) {
          // For regular privacy analysis (not ghost mode), select the created chat
          if (!isGhostMode) {
            await fetchChats();
            selectChat(result.chat.id);
          }
        }
      } else {
        // Regular chat creation
        const chatData: ChatPostRequest = {
          title: chatTitle.trim(),
          messages: chatMessages.length > 0 ? chatMessages.map(msg => ({
            sender: msg.sender,
            content: msg.content,
            timestamp: msg.timestamp || new Date(),
            metadata: null
          } as any)) : undefined
        };

        const newChat = await createChat(chatData);
        await fetchChats();
        selectChat(newChat.id);
        showToast("Chat created! Ready for analysis ✨", "success");
      }
      
      // Reset form and close modal
      resetCreateChatModal();
      setIsCreateModalOpen(false);
      
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create chat", "error");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleEditChatTitle = async (chatId: string, showToast: (message: string, type: "success" | "error") => void) => {
    if (!editingTitle.trim()) {
      showToast("Chat title cannot be empty", "error");
      return;
    }

    try {
      setIsUpdatingTitle(true);
      await updateChat({ id: chatId, title: editingTitle.trim() });
      await fetchChats();
      setEditingChatId(null);
      setEditingTitle("");
      showToast("Title updated ✨", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update title", "error");
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handleDeleteChat = async (showToast: (message: string, type: "success" | "error") => void) => {
    if (!selectedChatId) return;

    try {
      setIsDeletingChat(true);
      const deleteRequest: ChatDeleteRequest = { id: selectedChatId };
      await deleteChat(deleteRequest);
      await fetchChats();
      
      // Clear selection since chat is deleted
      selectChat(null);
      
      setIsDeleteDialogOpen(false);
      showToast("Chat deleted 🗑️", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete chat", "error");
    } finally {
      setIsDeletingChat(false);
    }
  };

  const startEditingChat = (chatId: string, title: string) => {
    setEditingChatId(chatId);
    setEditingTitle(title);
  };

  const cancelEditingChat = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  const resetCreateChatModal = () => {
    setChatTitle("");
    setChatMessages([]);
    setNewMessageSender("");
    setNewMessageContent("");
    setWhatsappImportText("");
    setImportMode("whatsapp"); // Default to WhatsApp
  };

  const closeCreateChatModal = () => {
    resetCreateChatModal();
    setIsCreateModalOpen(false);
  };

  return {
    // State
    chats,
    selectedChatId,
    editingChatId,
    editingTitle,
    isUpdatingTitle,
    isDeleteDialogOpen,
    isDeletingChat,
    isCreateModalOpen,
    isCreatingChat,
    chatTitle,
    chatMessages,
    newMessageSender,
    newMessageContent,
    whatsappImportText,
    importMode,
    
    // Setters
    selectChat,
    setEditingChatId,
    setEditingTitle,
    setIsDeleteDialogOpen,
    setIsCreateModalOpen,
    setChatTitle,
    setChatMessages,
    setNewMessageSender,
    setNewMessageContent,
    setWhatsappImportText,
    setImportMode,
    
    // Actions
    handleCreateChat,
    handleEditChatTitle,
    handleDeleteChat,
    startEditingChat,
    cancelEditingChat,
    closeCreateChatModal,
    resetCreateChatModal,
    fetchChats,
    
    // Computed values
    selectedChat: selectedChatId ? chats.find(chat => chat.id === selectedChatId) || null : null,
  };
}; 