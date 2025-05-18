import { create } from "zustand";
import { Message } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { useAuthStore } from "./authStore";
import { MessageGetRequest, MessagePostRequest, MessagePutRequest, MessageDeleteRequest } from "@/types/api/apiRequest";

interface MessageState {
  messages: Message[];
  selectedMessage: Message | null;
  isLoading: boolean;
  error: Error | null;
}

interface MessageActions {
  setSelectedMessage: (message: Message) => Promise<void>;
  fetchMessages: (params?: MessageGetRequest) => Promise<Message[]>;
  fetchMessage: (id: string) => Promise<Message | null>;
  createMessage: (data: MessagePostRequest) => Promise<Message>;
  updateMessage: (data: MessagePutRequest) => Promise<Message>;
  deleteMessage: (data: MessageDeleteRequest) => Promise<boolean>;
}

export type MessageStore = MessageState & MessageActions;

export const useMessageStore = create<MessageStore>((set) => {
  const getAccessToken = () => useAuthStore.getState().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    messages: [],
    selectedMessage: null,
    isLoading: false,
    error: null,

    setSelectedMessage: async (message: Message) => {
      set({ selectedMessage: message });
    },

    fetchMessages: async (params) => {
      try {
        set({ isLoading: true, error: null });
        const messages = await networkService.fetchMessages(params);
        set({ messages, isLoading: false });
        return messages;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    fetchMessage: async (id) => {
      try {
        set({ isLoading: true, error: null });
        const messages = await networkService.fetchMessages({ id });
        const message = messages.length > 0 ? messages[0] : null;
        set({ isLoading: false });
        return message;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    createMessage: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const message = await networkService.createMessage(data);
        set((state) => ({ 
          messages: [...state.messages, message],
          isLoading: false 
        }));
        return message;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    updateMessage: async (data) => {
      try {
        set({ isLoading: true, error: null });
        const updatedMessage = await networkService.updateMessage(data);
        set((state) => ({
          messages: state.messages.map(msg => msg.id === data.id ? updatedMessage : msg),
          isLoading: false
        }));
        return updatedMessage;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    },

    deleteMessage: async (data) => {
      try {
        set({ isLoading: true, error: null });
        await networkService.deleteMessage(data);
        set((state) => ({
          messages: state.messages.filter(msg => msg.id !== data.id),
          isLoading: false
        }));
        return true;
      } catch (error) {
        set({ error: error as Error, isLoading: false });
        throw error;
      }
    }
  };
});