"use client";

import {
  useAuthStore,
  useMessageStore,
  useChatStore,
  useAnalysisStore,
  useCreditStore,
} from "@/frontend/store";
import { AppContextType } from "@/shared/types/app";

export function useAppState(): AppContextType {
  const auth = useAuthStore();
  const message = useMessageStore();
  const chat = useChatStore();
  const credit = useCreditStore();
  const analysis = useAnalysisStore();

  return {
    isInitialized: auth.isInitialized,
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
