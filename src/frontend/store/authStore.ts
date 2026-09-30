import { create } from "zustand";
import type { PublicUser as User } from "@/shared/types/api/publicDtos";
import { createNetworkService } from "@/shared/utils/network";
import { LOCAL_STORAGE_KEYS } from "@/shared/utils/storage";
import type {
  AuthWebPostRequest,
  UserPutRequest,
} from "@/shared/types/api/apiRequest";
import {
  assertCurrentSession,
  resetAccountScope,
  sessionGeneration,
} from "./sessionScope";
import { resetRevenueCatIdentity } from "@/frontend/lib/revenueCatWeb";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  sessionGeneration: number;
  isInitialized: boolean;
  isAuthenticated: boolean;
  networkService: ReturnType<typeof createNetworkService>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  fetchUser: () => Promise<User>;
  updateUser: (data: UserPutRequest) => Promise<User>;
  deleteUser: () => Promise<void>;
  initialize: () => Promise<void>;
  login: (data: AuthWebPostRequest) => Promise<User>;
  logout: () => Promise<void>;
  expireSession: () => void;
  getNetworkService: () => ReturnType<typeof createNetworkService>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const service = createNetworkService(() => get().accessToken);
  const clearIdentity = () => {
    const generation = resetAccountScope();
    resetRevenueCatIdentity();
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_CHAT_ID);
    } catch {
      /* unavailable storage */
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      sessionGeneration: generation,
    });
  };
  const acceptUser = (user: User) => {
    if (get().user?.id !== user.id) clearIdentity();
    set({ user, accessToken: null, isAuthenticated: true });
  };
  return {
    user: null,
    accessToken: null,
    sessionGeneration: sessionGeneration(),
    isInitialized: false,
    isAuthenticated: false,
    networkService: service,
    login: async (data) => {
      clearIdentity();
      const generation = sessionGeneration();
      const response = await service.login(data);
      assertCurrentSession(generation);
      // The request epoch already cleared private state before the login request.
      set({
        user: response.user,
        accessToken: null,
        isAuthenticated: true,
        isInitialized: true,
      });
      return response.user;
    },
    initialize: async () => {
      const generation = sessionGeneration();
      try {
        const user = await service.fetchUser();
        assertCurrentSession(generation);
        acceptUser(user);
      } catch {
        if (generation === sessionGeneration()) clearIdentity();
      } finally {
        set({ isInitialized: true });
      }
    },
    fetchUser: async () => {
      const generation = sessionGeneration();
      const user = await service.fetchUser();
      assertCurrentSession(generation);
      return user;
    },
    updateUser: async (data) => {
      const generation = sessionGeneration();
      const user = await service.updateUser(data);
      assertCurrentSession(generation);
      return user;
    },
    deleteUser: async () => {
      const generation = sessionGeneration();
      await service.deleteUser();
      assertCurrentSession(generation);
      clearIdentity();
    },
    setUser: (user) => {
      if (user) acceptUser(user);
      else clearIdentity();
    },
    setAccessToken: (accessToken) => set({ accessToken }),
    setInitialized: (isInitialized) => set({ isInitialized }),
    logout: async () => {
      // Clear immediately, including when the logout HTTP response is lost.
      clearIdentity();
      await service.logout();
    },
    expireSession: clearIdentity,
    getNetworkService: () => service,
  };
});
