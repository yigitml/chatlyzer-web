import { useEffect, useState, useRef } from 'react';

/**
 * A hook to safely initialize a store only on the client side after hydration
 * 
 * @param initializeFunction - The function to call for store initialization
 * @returns boolean indicating if initialization has completed
 */
export function useStoreInitializer(initializeFunction: () => void | Promise<void>): boolean {
  const [initialized, setInitialized] = useState(false);
  const initializationAttempted = useRef(false);
  
  useEffect(() => {
    if (initializationAttempted.current) {
      return;
    }
    
    const init = async () => {
      try {
        initializationAttempted.current = true;
        await Promise.resolve(initializeFunction());
        setInitialized(true);
      } catch (error) {
        setInitialized(true);
      }
    };

    init();
  }, [initializeFunction]);

  return initialized;
} 