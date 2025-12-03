import { create } from "zustand";
import { Message } from "../../generated/client/browser";
import { useAuthStore } from "./authStore";
import { MessageGetRequest, MessagePostRequest, MessagePutRequest, MessageDeleteRequest } from "@/shared/types/api/apiRequest";
interface MessageState {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  fetchMessages: (params?: MessageGetRequest) => Promise<Message[]>;
  createMessage: (data: MessagePostRequest) => Promise<Message>;
  updateMessage: (data: MessagePutRequest) => Promise<Message>;
  deleteMessage: (data: MessageDeleteRequest) => Promise<boolean>;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  fetchMessages: async (params?: MessageGetRequest) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const messages = await networkService.fetchMessages(params);
      set({ messages, isLoading: false });
      return messages;
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  createMessage: async (data: MessagePostRequest) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const message = await networkService.createMessage(data);
      set((state) => ({
        messages: [...state.messages, message],
        isLoading: false,
      }));
      return message;
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  updateMessage: async (data: MessagePutRequest) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const message = await networkService.updateMessage(data);
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === message.id ? message : m
        ),
        isLoading: false,
      }));
      return message;
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  deleteMessage: async (data: MessageDeleteRequest) => {
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      await networkService.deleteMessage(data);
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== data.id),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },
}));