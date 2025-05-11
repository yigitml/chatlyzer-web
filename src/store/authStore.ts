import { create } from "zustand";
import { User } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { LOCAL_STORAGE_KEYS } from "@/types/api/apiEndpoints";
import { AuthWebPostRequest, UserPutRequest } from "@/types/api/apiRequest";

interface AuthState {
  isInitialized: boolean;
  accessToken: string | null;
  user: User | null;
  error: Error | null;
  isLoggingIn: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (data: AuthWebPostRequest) => Promise<User>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  fetchUser: () => Promise<User>;
  updateUser: (data: UserPutRequest) => Promise<User>;
  setIsLoggingIn: (value: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => {
  const getAccessToken = () => get().accessToken;
  const networkService = createNetworkService(getAccessToken);

  return {
    isInitialized: false,
    accessToken: null,
    user: null,
    error: null,
    isLoggingIn: false,

    setIsLoggingIn: (value: boolean) => {
      set({ isLoggingIn: value });
    },

    initialize: async () => {
      try {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
          const expiresAt = localStorage.getItem(LOCAL_STORAGE_KEYS.EXPIRES_AT);

          if (token && expiresAt) {
            const expiryTimestamp = parseInt(expiresAt, 10) * 1000;
            const currentTimestamp = Date.now();

            if (expiryTimestamp > currentTimestamp) {
              set({ accessToken: token });
              await get().fetchUser();
            } else {
              try {
                await get().refreshToken();
              } catch (error) {
                localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
                localStorage.removeItem(LOCAL_STORAGE_KEYS.EXPIRES_AT);
              }
            }
          }
        }
        set({ isInitialized: true });
      } catch (error) {
        set({ error: error as Error, isInitialized: true });
      }
    },

    login: async (data) => {
      try {
        const response = await networkService.login(data);
        const token = response.token;
        const expiresAt = response.expiresAt;

        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, token);
          localStorage.setItem(LOCAL_STORAGE_KEYS.EXPIRES_AT, expiresAt);
        }

        set({ accessToken: token, user: response.user });
        return response.user;
      } catch (error) {
        set({ error: error as Error });
        throw error;
      }
    },

    logout: async () => {
      try {
        await networkService.logout();
        if (typeof window !== "undefined") {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.EXPIRES_AT);
        }
        set({ accessToken: null, user: null });
      } catch (error) {
        set({ error: error as Error });
        throw error;
      }
    },

    refreshToken: async () => {
      try {
        const response = await networkService.refreshToken();
        const newToken = response.token;
        const newExpiresAt = response.expiresAt;

        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, newToken);
          localStorage.setItem(LOCAL_STORAGE_KEYS.EXPIRES_AT, newExpiresAt);
        }

        set({ accessToken: newToken });
      } catch (error) {
        await get().logout();
        throw error;
      }
    },

    fetchUser: async () => {
      try {
        const user = await networkService.fetchUser();
        set({ user });
        return user;
      } catch (error) {
        set({ error: error as Error });
        throw error;
      }
    },

    updateUser: async (data) => {
      try {
        const user = await networkService.updateUser(data);
        set({ user });
        return user;
      } catch (error) {
        set({ error: error as Error });
        throw error;
      }
    },
  };
});
