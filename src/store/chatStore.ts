import { create } from "zustand";
import { Chat } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { useAuthStore } from "./authStore";
import { ChatGetRequest, ChatPostRequest, ChatPutRequest, ChatDeleteRequest } from "@/types/api/apiRequest";

interface ChatState {
  chats: Chat[];
  selectedChat: Chat | null;
  isLoading: boolean;
  error: Error | null;
}

interface ChatActions {
  setSelectedChat: (chat: Chat) => Promise<void>;
  fetchChats: (params?: ChatGetRequest) => Promise<Chat[]>;
  fetchChat: (id: string) => Promise<Chat | null>;
  createChat: (data: ChatPostRequest) => Promise<Chat>;
  updateChat: (data: ChatPutRequest) => Promise<Chat>;
  deleteChat: (data: ChatDeleteRequest) => Promise<void>;
}

export type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>((set, get) => {
  const getAccessToken = () => useAuthStore.getState().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    chats: [],
    selectedChat: null,
    isLoading: false,
    error: null,

    setSelectedChat: async (chat: Chat) => {
      set({ selectedChat: chat });
    },

    fetchChats: async (params) => {
      try {
        set({ isLoading: true, error: null });
        const chats = await networkService.fetchChats(params);
        set({ chats, isLoading: false });
        return chats;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    fetchChat: async (id) => {
      try {
        set({ isLoading: true, error: null });
        const chats = await networkService.fetchChats({ id });
        const chat = chats.length > 0 ? chats[0] : null;
        set({ isLoading: false });
        return chat;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    createChat: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const chat = await networkService.createChat(data);
        set((state) => ({ 
          chats: [...state.chats, chat],
          isLoading: false 
        }));
        return chat;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    updateChat: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const updatedChat = await networkService.updateChat(data);
        set((state) => ({
          chats: state.chats.map(chat => chat.id === data.id ? updatedChat : chat),
          isLoading: false
        }));
        return updatedChat;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    deleteChat: async (data) => {
      try {
        set({ isLoading: true, error: null });
        await networkService.deleteChat(data);
        set((state) => ({
          chats: state.chats.filter(chat => chat.id !== data.id),
          selectedChat: state.selectedChat?.id === data.id ? null : state.selectedChat,
          isLoading: false
        }));
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    selectChat: (chat: Chat | null) => {
      set({ selectedChat: chat });
    }
  };
});