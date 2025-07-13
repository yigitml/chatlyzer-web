"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useMessageStore } from "@/store/messageStore";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Toast } from "@/components/common/toast";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { CreateChatModal } from "@/components/modals/create-chat-modal";
import { DeleteChatModal } from "@/components/modals/delete-chat-modal";
import { CreatePrivacyAnalysisModal } from "@/components/modals/create-privacy-analysis-modal";
import { useChatManagement } from "@/hooks/use-chat-management";
import { useAnalysisManagement } from "@/hooks/use-analysis-management";
import { useToast } from "@/hooks/use-toast";
import { useUIState } from "@/hooks/use-ui-state";
import { getStorageItem, LOCAL_STORAGE_KEYS } from "@/utils/storage";
import Link from "next/link";
import { AnalysisType } from "@/types/api/apiRequest";

export default function UserDashboard() {
  const hasFetchedData = useRef(false);
  
  // Store hooks
  const { user, isInitialized } = useAuthStore();
  const { messages, fetchMessages } = useMessageStore();
  
  // Custom hooks
  const chatManagement = useChatManagement();
  const analysisManagement = useAnalysisManagement();
  const { toast, showToast, hideToast } = useToast();
  const { sidebarCollapsed, isLoadingChatData, setIsLoadingChatData, toggleSidebar } = useUIState();

  // Computed values
  const selectedChatMessages = chatManagement.selectedChatId ? messages.filter(msg => msg.chatId === chatManagement.selectedChatId) : [];
  const selectedChatAnalyzes = chatManagement.selectedChatId ? analysisManagement.analyzes.filter(analysis => analysis.chatId === chatManagement.selectedChatId) : [];
  const analysesByType = chatManagement.selectedChatId ? analysisManagement.getAnalysesByType(chatManagement.selectedChatId) : {};

  // Data fetching
  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchData = async () => {
      if (hasFetchedData.current || !user?.id) return;
      
      try {
        hasFetchedData.current = true;
        await Promise.all([
          chatManagement.fetchChats(),
          analysisManagement.fetchAnalyzes(),
          analysisManagement.fetchCredits(),
        ]);
      } catch (error) {
        hasFetchedData.current = false;
        if (!abortController.signal.aborted && error instanceof Error && error.name !== 'AbortError') {
          showToast(error.message || "Failed to load data", "error");
        }
      }
    };

    fetchData();
    
    return () => {
      abortController.abort();
    };
  }, [user]);

  useEffect(() => {
    if (!chatManagement.selectedChatId) return;
    
    const abortController = new AbortController();
    
    const fetchChatData = async () => {
      try {
        setIsLoadingChatData(true);
        analysisManagement.setSelectedAnalysisType(null);
        
        await Promise.all([
          chatManagement.selectedChatId && fetchMessages({ chatId: chatManagement.selectedChatId }),
          chatManagement.selectedChatId && analysisManagement.fetchAnalyzes({ chatId: chatManagement.selectedChatId })
        ]);
      } catch (error) {
        if (!abortController.signal.aborted && error instanceof Error && error.name !== 'AbortError') {
          showToast(error.message || "Failed to load chat data", "error");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setTimeout(() => {
            setIsLoadingChatData(false);
          }, 100);
        }
      }
    };

    fetchChatData();
    
    return () => {
      abortController.abort();
    };
  }, [chatManagement.selectedChatId, fetchMessages, analysisManagement.fetchAnalyzes]);

  useEffect(() => {
    if (chatManagement.chats.length > 0) {
      const storedChatId = getStorageItem(LOCAL_STORAGE_KEYS.SELECTED_CHAT_ID, null);
      const storedChatExists = storedChatId && chatManagement.chats.some(chat => chat.id === storedChatId);
      
      if (storedChatExists && chatManagement.selectedChatId !== storedChatId) {
        chatManagement.selectChat(storedChatId);
      } else if (!chatManagement.selectedChatId && !storedChatExists) {
        chatManagement.selectChat(chatManagement.chats[0].id);
      }
    }
  }, [chatManagement.chats, chatManagement.selectedChatId]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="text-white/60 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not authenticated</h1>
          <Link href="/auth/sign-in" className="text-purple-400 hover:text-purple-300">
            Sign in to continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Header user={user} totalCredits={analysisManagement.totalCredits} />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteChatModal
        isOpen={chatManagement.isDeleteDialogOpen}
        onClose={() => chatManagement.setIsDeleteDialogOpen(false)}
        onDeleteChat={() => chatManagement.handleDeleteChat(showToast)}
        isDeleting={chatManagement.isDeletingChat}
        chatTitle={chatManagement.selectedChat?.title || ""}
      />

      {/* Create Chat Modal */}
      <CreateChatModal
        isOpen={chatManagement.isCreateModalOpen}
        onClose={chatManagement.closeCreateChatModal}
        onCreateChat={() => chatManagement.handleCreateChat(showToast)}
        isCreating={chatManagement.isCreatingChat}
        chatTitle={chatManagement.chatTitle}
        onTitleChange={chatManagement.setChatTitle}
        chatMessages={chatManagement.chatMessages}
        onMessagesChange={chatManagement.setChatMessages}
        newMessageSender={chatManagement.newMessageSender}
        onNewMessageSenderChange={chatManagement.setNewMessageSender}
        newMessageContent={chatManagement.newMessageContent}
        onNewMessageContentChange={chatManagement.setNewMessageContent}
        whatsappImportText={chatManagement.whatsappImportText}
        onWhatsappImportTextChange={chatManagement.setWhatsappImportText}
        importMode={chatManagement.importMode}
        onImportModeChange={chatManagement.setImportMode}
        onShowToast={showToast}
      />

      {/* Create Privacy Analysis Modal */}
      <CreatePrivacyAnalysisModal
        isOpen={chatManagement.isPrivacyAnalysisModalOpen}
        onClose={chatManagement.closePrivacyAnalysisModal}
        onCreatePrivacyAnalysis={() => chatManagement.handleCreatePrivacyAnalysis(showToast)}
        isCreating={chatManagement.isCreatingPrivacyAnalysis}
        chatTitle={chatManagement.privacyAnalysisTitle}
        onTitleChange={chatManagement.setPrivacyAnalysisTitle}
        chatMessages={chatManagement.privacyAnalysisMessages}
        onMessagesChange={chatManagement.setPrivacyAnalysisMessages}
        newMessageSender={chatManagement.newMessageSender}
        onNewMessageSenderChange={chatManagement.setNewMessageSender}
        newMessageContent={chatManagement.newMessageContent}
        onNewMessageContentChange={chatManagement.setNewMessageContent}
        whatsappImportText={chatManagement.whatsappImportText}
        onWhatsappImportTextChange={chatManagement.setWhatsappImportText}
        importMode={chatManagement.importMode}
        onImportModeChange={chatManagement.setImportMode}
        onShowToast={showToast}
      />

      <div className="flex h-[calc(100vh-73px)] relative">
        {/* Mobile Sidebar Overlay */}
        {!sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => toggleSidebar()}
          />
        )}
        
        {/* Sidebar */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          chats={chatManagement.chats}
          selectedChatId={chatManagement.selectedChatId}
          onSelectChat={chatManagement.selectChat}
          onCreateChat={() => chatManagement.setIsCreateModalOpen(true)}
          editingChatId={chatManagement.editingChatId}
          editingTitle={chatManagement.editingTitle}
          isUpdatingTitle={chatManagement.isUpdatingTitle}
          onEditChat={chatManagement.startEditingChat}
          onSaveEdit={(chatId: string) => chatManagement.handleEditChatTitle(chatId, showToast)}
          onCancelEdit={chatManagement.cancelEditingChat}
          onTitleChange={chatManagement.setEditingTitle}
          onCreatePrivacyAnalysis={() => chatManagement.setIsPrivacyAnalysisModalOpen(true)}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto min-w-0">
          <MainContent
            selectedChat={chatManagement.selectedChat}
            selectedChatMessages={selectedChatMessages}
            selectedChatAnalyzes={selectedChatAnalyzes}
            analysesByType={analysesByType as Record<AnalysisType, any>}
            selectedAnalysisType={analysisManagement.selectedAnalysisType}
            isLoadingChatData={isLoadingChatData}
            isAnalyzing={analysisManagement.isAnalyzing}
            totalCredits={analysisManagement.totalCredits}
            onAnalyzeChat={() => chatManagement.selectedChatId && analysisManagement.handleAnalyzeChat(chatManagement.selectedChatId, showToast)}
            onDeleteChat={() => chatManagement.setIsDeleteDialogOpen(true)}
            onCreateChat={() => chatManagement.setIsCreateModalOpen(true)}
            onSelectAnalysisType={analysisManagement.setSelectedAnalysisType}
          />
        </div>
      </div>
    </div>
  );
}