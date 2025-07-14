import { create } from "zustand";
import { User } from "@prisma/client";
import { createNetworkService } from "@/lib/network";
import { LOCAL_STORAGE_KEYS } from "@/utils/storage";
import { AuthWebPostRequest, UserPutRequest } from "@/types/api/apiRequest";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  networkService: ReturnType<typeof createNetworkService> | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  fetchUser: () => Promise<User>;
  updateUser: (data: UserPutRequest) => Promise<User>;
  deleteUser: () => Promise<void>;
  initialize: () => Promise<void>;
  login: (data: AuthWebPostRequest) => Promise<User>;
  logout: () => Promise<void>;
  getNetworkService: () => ReturnType<typeof createNetworkService>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const getCurrentToken = () => {
    const token = get().accessToken;
    if (token) return token;
    return localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
  };

  const sharedNetworkService = createNetworkService(getCurrentToken);

  return {
    user: null,
    accessToken: null,
    isInitialized: false,
    isAuthenticated: false,
    networkService: sharedNetworkService,

    login: async (data: AuthWebPostRequest) => {
      try {
        const response = await sharedNetworkService.login(data);
        
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, response.token);
        localStorage.setItem(LOCAL_STORAGE_KEYS.EXPIRES_AT, response.expiresAt);
        
        set({
          user: response.user,
          accessToken: response.token,
          isAuthenticated: true
        });

        return response.user;
      } catch (error) {
        console.error("Login failed:", error);
        throw error;
      }
    },

    initialize: async () => {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
      
      let userNetworkService = null;
      
      if (token) {
        set({ accessToken: token });
        
        try {
          userNetworkService = createNetworkService(() => token);
          
          const userData = await userNetworkService.fetchUser();
          
          set({
            user: userData,
            isAuthenticated: true,
            networkService: userNetworkService,
          });
        } catch (error) {
          console.error('AUTH STORE: Error validating token:', error);
          // TODO: Clear invalid token
          // localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
        }
      }
      
      set({ isInitialized: true });
      
      return;
    },

    fetchUser: async () => {
      const { networkService } = get();
      if (networkService) {
        return await networkService.fetchUser();
      }
      throw new Error("Network service not initialized");
    },

    updateUser: async (data: UserPutRequest) => {
      const { networkService } = get();
      if (networkService) {
        return await networkService.updateUser(data);
      }
      throw new Error("Network service not initialized");
    },

    deleteUser: async () => {
      const { networkService } = get();
      if (networkService) {
        return await networkService.deleteUser();
      }
      throw new Error("Network service not initialized");
    },

    setUser: (user) =>
      set({
        user,
        isAuthenticated: !!user,
      }),

    setAccessToken: (token) =>
      set({
        accessToken: token,
      }),

    setInitialized: (initialized) =>
      set({
        isInitialized: initialized,
      }),

    logout: async () => {
      const { networkService } = get();
      if (networkService) {
        await networkService.logout();
      }
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        networkService: null,
      });
    },

    getNetworkService: () => sharedNetworkService,
  };
});
