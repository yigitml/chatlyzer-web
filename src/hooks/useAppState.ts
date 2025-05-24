"use client";

import {
  useAuthStore,
  useUIStore,
  useMessageStore,
  useChatStore,
  useAnalysisStore,
  useCreditStore,
} from "@/store";
import { AppContextType } from "@/types/app";

export function useAppState(): AppContextType {
  const auth = useAuthStore();
  const ui = useUIStore();
  const message = useMessageStore();
  const chat = useChatStore();
  const credit = useCreditStore();
  const analysis = useAnalysisStore();

  return {
    isInitialized: auth.isInitialized,
    activeTab: ui.activeTab,
    tabs: ui.tabs,
    accessToken: auth.accessToken,
    user: auth.user,
    analyzes: analysis.analyzes,
    messages: message.messages,
    chats: chat.chats,
    selectedChat: chat.selectedChat,
    credits: credit.credits,
    subscription: credit.subscription,

    login: auth.login,
    logout: auth.logout,
    fetchUser: auth.fetchUser,
    updateUser: auth.updateUser,

    setActiveTab: ui.setActiveTab,

    fetchAnalyzes: analysis.fetchAnalyzes,
    createAnalysis: analysis.createAnalysis,
    updateAnalysis: analysis.updateAnalysis,
    deleteAnalysis: analysis.deleteAnalysis,

    fetchMessages: message.fetchMessages,
    createMessage: message.createMessage,
    updateMessage: message.updateMessage,
    deleteMessage: message.deleteMessage,

    fetchChats: chat.fetchChats,
    createChat: chat.createChat,
    updateChat: chat.updateChat,
    deleteChat: chat.deleteChat,

    fetchCredits: credit.fetchCredits,
    fetchSubscription: credit.fetchSubscription,

  };
}
