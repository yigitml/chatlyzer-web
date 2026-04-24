import { create } from "zustand";
import { User } from "../../generated/client/browser";
import { createNetworkService } from "@/shared/utils/network";
import { LOCAL_STORAGE_KEYS } from "@/shared/utils/storage";
import { AuthWebPostRequest, UserPutRequest } from "@/shared/types/api/apiRequest";

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
    return get().accessToken;
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
        
        // Token is now set as an HttpOnly cookie by the server.
        // Keep in-memory copy for Bearer header backward compat.
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
      // Try to validate the session using the HttpOnly cookie.
      // The cookie is sent automatically with credentials: 'include'.
      try {
        const userData = await sharedNetworkService.fetchUser();
        
        set({
          user: userData,
          isAuthenticated: true,
          networkService: sharedNetworkService,
        });
      } catch (error) {
        // No valid session cookie — user is not authenticated
        console.debug('AUTH STORE: No valid session, user not authenticated');
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
      // Clear any remaining localStorage data (non-auth preferences)
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SELECTED_CHAT_ID);
      } catch (e) {
        console.error("Failed to clear localStorage on logout", e);
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
