import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useStoreInitializer } from '@/hooks/useStoreInitializer';
import { 
  useAuthStore, 
  useUIStore, 
  useLanguageStore,
  useCreditStore,
  useMessageStore,
  useChatStore,
  useAnalysisStore
} from '@/store';

interface StoreContextValue {
  initialized: boolean;
}

const StoreContext = createContext<StoreContextValue>({
  initialized: false
});

export const useStoreContext = () => useContext(StoreContext);

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const authInitialize = useAuthStore(state => state.initialize);
  const uiInitialize = useUIStore(state => state.initialize);
  const languageInitialize = useLanguageStore(state => state.initialize);
  
  const messageStore = useMessageStore();
  const chatStore = useChatStore();
  const analysisStore = useAnalysisStore();
  const creditStore = useCreditStore();

  const initializeStores = useCallback(async () => {
    if (languageInitialize) {
      await Promise.resolve(languageInitialize());
    }
    
    if (authInitialize) {
      await Promise.resolve(authInitialize());
    }
    
    if (uiInitialize) {
      await Promise.resolve(uiInitialize());
    }
  }, [
    authInitialize, 
    languageInitialize, 
    uiInitialize, 
    analysisStore,
    chatStore,
    creditStore,
    messageStore
  ]);

  const initialized = useStoreInitializer(initializeStores);
  
  return (
    <StoreContext.Provider value={{ initialized }}>
      {children}
    </StoreContext.Provider>
  );
} 