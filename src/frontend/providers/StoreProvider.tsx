import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useStoreInitializer } from "@/frontend/hooks/useStoreInitializer";
import {
  useAuthStore,
  useLanguageStore,
  useCreditStore,
} from "@/frontend/store";

interface StoreContextValue {
  initialized: boolean;
}

const StoreContext = createContext<StoreContextValue>({
  initialized: false,
});

export const useStoreContext = () => useContext(StoreContext);

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const sessionGeneration = useAuthStore((state) => state.sessionGeneration);
  const expireSession = useAuthStore((state) => state.expireSession);
  useEffect(() => {
    window.addEventListener("chatlyzer:session-expired", expireSession);
    return () =>
      window.removeEventListener("chatlyzer:session-expired", expireSession);
  }, [expireSession]);
  const authInitialize = useAuthStore((state) => state.initialize);
  const languageInitialize = useLanguageStore((state) => state.initialize);
  const creditInitialize = useCreditStore((state) => state.initialize);

  const initFunctionsRef = useRef({
    authInitialize,
    languageInitialize,
    creditInitialize,
  });

  useEffect(() => {
    initFunctionsRef.current = {
      authInitialize,
      languageInitialize,
      creditInitialize,
    };
  }, [authInitialize, languageInitialize, creditInitialize]);

  const initializeStores = useCallback(async () => {
    const { languageInitialize, authInitialize, creditInitialize } =
      initFunctionsRef.current;

    if (languageInitialize) {
      await Promise.resolve(languageInitialize());
    }

    if (authInitialize) {
      await Promise.resolve(authInitialize());
    }

    if (creditInitialize) {
      await Promise.resolve(creditInitialize());
    }
  }, []);

  const initialized = useStoreInitializer(initializeStores);

  return (
    <StoreContext.Provider value={{ initialized }}>
      <React.Fragment key={sessionGeneration}>{children}</React.Fragment>
    </StoreContext.Provider>
  );
}
