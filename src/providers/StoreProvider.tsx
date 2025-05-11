import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useStoreInitializer } from '@/hooks/useStoreInitializer';
import { 
  useAuthStore, 
  useUIStore, 
  useLanguageStore,
  useCreditStore,
  useMessageStore,
  useChatStore,
  useAnalyticsResultStore
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
  const analyticsResultStore = useAnalyticsResultStore();
  const creditStore = useCreditStore();
  const initializeStores = async () => {
    if (languageInitialize) {
      await Promise.resolve(languageInitialize());
    }
    
    if (authInitialize) {
      await Promise.resolve(authInitialize());
    }
    
    if (uiInitialize) {
      await Promise.resolve(uiInitialize());
    }
    
    const promises = [];
    
    if ('initialize' in analyticsResultStore && typeof analyticsResultStore.initialize === 'function') {
      promises.push(Promise.resolve(analyticsResultStore.initialize()));
    }
    
    if ('initialize' in messageStore && typeof messageStore.initialize === 'function') {
      promises.push(Promise.resolve(messageStore.initialize()));
    }
    
    if ('initialize' in chatStore && typeof chatStore.initialize === 'function') {
      promises.push(Promise.resolve(chatStore.initialize()));
    }
    
    if ('initialize' in creditStore && typeof creditStore.initialize === 'function') {
      promises.push(Promise.resolve(creditStore.initialize()));
    }
    
    if ('initialize' in analyticsResultStore && typeof analyticsResultStore.initialize === 'function') {
      promises.push(Promise.resolve(analyticsResultStore.initialize()));
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };
  
  const initialized = useStoreInitializer(initializeStores);
  
  return (
    <StoreContext.Provider value={{ initialized }}>
      {children}
    </StoreContext.Provider>
  );
} 