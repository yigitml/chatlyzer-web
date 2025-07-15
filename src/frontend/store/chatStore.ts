import { create } from "zustand";
import { Chat } from "@prisma/client";
import { useAuthStore } from "./authStore";
import { ChatGetRequest, ChatPostRequest, ChatPutRequest, ChatDeleteRequest } from "@/shared/types/api/apiRequest";
interface ChatState {
  chats: Chat[];
  selectedChat: Chat | null;
  isLoading: boolean;
  error: Error | null;
  fetchChats: (params?: ChatGetRequest) => Promise<Chat[]>;
  fetchChat: (id: string) => Promise<Chat | null>;
  createChat: (data: ChatPostRequest) => Promise<Chat>;
  updateChat: (data: ChatPutRequest) => Promise<Chat>;
  deleteChat: (data: ChatDeleteRequest) => Promise<void>;
  setSelectedChat: (chat: Chat | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  selectedChat: null,
  isLoading: false,
  error: null,

  fetchChats: async (params?: ChatGetRequest) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const chats = await networkService.fetchChats(params);
      set({ chats, isLoading: false });
      return chats;
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  fetchChat: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const chats = await networkService.fetchChats({ id });
      const chat = chats.length > 0 ? chats[0] : null;
      set({ isLoading: false });
      return chat;
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  createChat: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const chat = await networkService.createChat(data);
      set((state) => ({
        chats: [...state.chats, chat],
        isLoading: false,
      }));
      return chat;
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  updateChat: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const chat = await networkService.updateChat(data);
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chat.id ? chat : c)),
        isLoading: false,
      }));
      return chat;
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  deleteChat: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      await networkService.deleteChat(data);
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== data.id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  setSelectedChat: (chat: Chat | null) => {
    set({ selectedChat: chat });
  },
}));