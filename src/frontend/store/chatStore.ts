import {
  assertCurrentSession,
  registerAccountReset,
  sessionGeneration,
} from "./sessionScope";
import { create } from "zustand";
import { Chat } from "../../generated/client";
import { useAuthStore } from "./authStore";
import {
  ChatGetRequest,
  ChatPostRequest,
  ChatPutRequest,
  ChatDeleteRequest,
} from "@/shared/types/api/apiRequest";
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

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  selectedChat: null,
  isLoading: false,
  error: null,

  fetchChats: async (params?: ChatGetRequest) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const chats = await networkService.fetchChats(params);
      assertCurrentSession(generation);
      set({ chats, isLoading: false });
      return chats;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  fetchChat: async (id: string) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const chats = await networkService.fetchChats({ id });
      assertCurrentSession(generation);
      const chat = chats.length > 0 ? chats[0] : null;
      set({ isLoading: false });
      return chat;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  createChat: async (data: any) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const chat = await networkService.createChat(data);
      assertCurrentSession(generation);
      set((state) => ({
        chats: [...state.chats, chat],
        isLoading: false,
      }));
      return chat;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  updateChat: async (data: any) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const chat = await networkService.updateChat(data);
      assertCurrentSession(generation);
      set((state) => ({
        chats: state.chats.map((c) => (c.id === chat.id ? chat : c)),
        isLoading: false,
      }));
      return chat;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  deleteChat: async (data: any) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      await networkService.deleteChat(data);
      assertCurrentSession(generation);
      set((state) => ({
        chats: state.chats.filter((c) => c.id !== data.id),
        isLoading: false,
      }));
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  setSelectedChat: (chat: Chat | null) => {
    set({ selectedChat: chat });
  },
}));

registerAccountReset(() =>
  useChatStore.setState({
    chats: [],
    selectedChat: null,
    isLoading: false,
    error: null,
  }),
);
