import {
  assertCurrentSession,
  registerAccountReset,
  sessionGeneration,
} from "./sessionScope";
import { create } from "zustand";
import { Message } from "../../generated/client";
import { useAuthStore } from "./authStore";
import {
  MessageGetRequest,
  MessagePostRequest,
  MessagePutRequest,
  MessageDeleteRequest,
} from "@/shared/types/api/apiRequest";
interface MessageState {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  fetchMessages: (params?: MessageGetRequest) => Promise<Message[]>;
  createMessage: (data: MessagePostRequest) => Promise<Message>;
  updateMessage: (data: MessagePutRequest) => Promise<Message>;
  deleteMessage: (data: MessageDeleteRequest) => Promise<boolean>;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,

  fetchMessages: async (params?: MessageGetRequest) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const messages = await networkService.fetchMessages(params);
      assertCurrentSession(generation);
      set({ messages, isLoading: false });
      return messages;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  createMessage: async (data: MessagePostRequest) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const message = await networkService.createMessage(data);
      assertCurrentSession(generation);
      set((state) => ({
        messages: [...state.messages, message],
        isLoading: false,
      }));
      return message;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  updateMessage: async (data: MessagePutRequest) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      const message = await networkService.updateMessage(data);
      assertCurrentSession(generation);
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === message.id ? message : m,
        ),
        isLoading: false,
      }));
      return message;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },

  deleteMessage: async (data: MessageDeleteRequest) => {
    const generation = sessionGeneration();
    try {
      set({ isLoading: true, error: null });
      const networkService = useAuthStore.getState().getNetworkService();
      await networkService.deleteMessage(data);
      assertCurrentSession(generation);
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== data.id),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      assertCurrentSession(generation);
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  },
}));

registerAccountReset(() =>
  useMessageStore.setState({ messages: [], isLoading: false, error: null }),
);
