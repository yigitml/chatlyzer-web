"use client";

import {
  useAuthStore,
  useUIStore,
  useMessageStore,
  useChatStore,
  useAnalyticsResultStore,
  useCreditStore,
} from "@/store";
import { AppContextType } from "@/types/app";

export function useAppState(): AppContextType {
  const auth = useAuthStore();
  const ui = useUIStore();
  const message = useMessageStore();
  const chat = useChatStore();
  const credit = useCreditStore();
  const analyticsResult = useAnalyticsResultStore();

  return {
    isInitialized: auth.isInitialized,
    error: auth.error,
    activeTab: ui.activeTab,
    tabs: ui.tabs,
    accessToken: auth.accessToken,
    user: auth.user,
    analyticsResults: analyticsResult.analyticsResults,
    selectedAnalyticsResult: analyticsResult.selectedAnalyticsResult,
    messages: message.messages,
    selectedMessage: message.selectedMessage,
    chats: chat.chats,
    selectedChat: chat.selectedChat,
    credits: credit.credits,
    subscription: credit.subscription,

    login: auth.login,
    logout: auth.logout,
    fetchUser: auth.fetchUser,
    updateUser: auth.updateUser,

    setActiveTab: ui.setActiveTab,

    fetchAnalyticsResults: analyticsResult.fetchAnalyticsResults,
    createAnalyticsResult: analyticsResult.createAnalyticsResult,
    selectAnalyticsResult: analyticsResult.setSelectedAnalyticsResult,
    updateAnalyticsResult: analyticsResult.updateAnalyticsResult,
    deleteAnalyticsResult: analyticsResult.deleteAnalyticsResult,

    fetchMessages: message.fetchMessages,
    createMessage: message.createMessage,
    selectMessage: message.setSelectedMessage,
    updateMessage: message.updateMessage,
    deleteMessage: message.deleteMessage,

    fetchChats: chat.fetchChats,
    createChat: chat.createChat,
    selectChat: chat.setSelectedChat,
    updateChat: chat.updateChat,
    deleteChat: chat.deleteChat,

    fetchCredits: credit.fetchCredits,
    fetchSubscription: credit.fetchSubscription,

  };
}
