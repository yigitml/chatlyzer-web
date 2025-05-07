import { useEffect, useState } from 'react';

/**
 * A hook to safely initialize a store only on the client side after hydration
 * 
 * @param initializeFunction - The function to call for store initialization
 * @returns boolean indicating if initialization has completed
 */
export function useStoreInitializer(initializeFunction: () => void | Promise<void>): boolean {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // This code only runs in the browser after hydration
    const init = async () => {
      try {
        await Promise.resolve(initializeFunction());
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize store:', error);
        setInitialized(true); // Mark as initialized even on error to prevent endless retries
      }
    };

    init();
  }, [initializeFunction]);

  return initialized;
} 