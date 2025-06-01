import React, { createContext, useContext, ReactNode, useCallback, useRef, useEffect, useState } from 'react';
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
  const creditInitialize = useCreditStore(state => state.initialize);
  
  const initFunctionsRef = useRef({ authInitialize, languageInitialize, uiInitialize, creditInitialize });
  
  useEffect(() => {
    initFunctionsRef.current = { authInitialize, languageInitialize, uiInitialize, creditInitialize };
  }, [authInitialize, languageInitialize, uiInitialize, creditInitialize]);

  const initializeStores = useCallback(async () => {
    const { languageInitialize, authInitialize, uiInitialize, creditInitialize } = initFunctionsRef.current;
    
    if (languageInitialize) {
      await Promise.resolve(languageInitialize());
    }
    
    if (authInitialize) {
      await Promise.resolve(authInitialize());
    }
    
    if (uiInitialize) {
      await Promise.resolve(uiInitialize());
    }

    if (creditInitialize) {
      await Promise.resolve(creditInitialize());
    }
  }, []);

  const initialized = useStoreInitializer(initializeStores);
  
  return (
    <StoreContext.Provider value={{ initialized }}>
      {children}
    </StoreContext.Provider>
  );
} 