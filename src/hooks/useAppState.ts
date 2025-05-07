"use client";

import {
  useAuthStore,
  useUIStore,
  useContactStore,
  useMessageStore,
  useChatStore,
  useAnalysisStore,
  useCreditStore,
} from "@/store";
import { AppContextType } from "@/types/app";

export function useAppState(): AppContextType {
  const auth = useAuthStore();
  const ui = useUIStore();
  const contact = useContactStore();
  const message = useMessageStore();
  const chat = useChatStore();
  const credit = useCreditStore();
  const analysis = useAnalysisStore();

  return {
    isInitialized: auth.isInitialized,
    error: auth.error,
    activeTab: ui.activeTab,
    tabs: ui.tabs,
    accessToken: auth.accessToken,
    user: auth.user,
    analyses: analysis.analyses,
    selectedAnalysis: analysis.selectedAnalysis,
    contacts: contact.contacts,
    selectedContact: contact.selectedContact,
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

    fetchContacts: contact.fetchContacts,
    createContact: contact.createContact,
    selectContact: contact.setSelectedContact,
    updateContact: contact.updateContact,
    deleteContact: contact.deleteContact,

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

    createAnalysis: analysis.createAnalysis,
    selectAnalysis: analysis.setSelectedAnalysis,
    updateAnalysis: analysis.updateAnalysis,
    deleteAnalysis: analysis.deleteAnalysis,


    fetchCredits: credit.fetchCredits,
    fetchSubscription: credit.fetchSubscription,

  };
}
