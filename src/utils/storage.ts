/**
 * Safely check if code is running in a browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Safely get an item from localStorage, handling cases where localStorage
 * might not be available (SSR, disabled in browser, etc)
 * 
 * @param key - The localStorage key
 * @param defaultValue - Default value to return if item doesn't exist
 * @returns The stored value or defaultValue if not found or not in browser
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (!isBrowser()) {
    return defaultValue;
  }
  
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Safely set an item in localStorage, handling cases where localStorage
 * might not be available
 * 
 * @param key - The localStorage key
 * @param value - The value to store
 * @returns boolean indicating success
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (!isBrowser()) {
    return false;
  }
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage:`, error);
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 * 
 * @param key - The localStorage key to remove
 * @returns boolean indicating success
 */
export function removeStorageItem(key: string): boolean {
  if (!isBrowser()) {
    return false;
  }
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item ${key} from localStorage:`, error);
    return false;
  }
}

export const LOCAL_STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  EXPIRES_AT: "expiresAt",
  SELECTED_CHAT_ID: "selectedChatId",
} as const;
