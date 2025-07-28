import { useState, useEffect, useCallback } from "react";
import { getStorageItem, setStorageItem, LOCAL_STORAGE_KEYS } from "@/shared/utils/storage";

const DEFAULT_SIDEBAR_WIDTH = 320; // 80 * 4 (w-80 in Tailwind)
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 600;
const MOBILE_BREAKPOINT = 1024; // lg breakpoint in Tailwind

// Custom hook to detect screen size
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Initial call to set correct size
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

export const useUIState = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isLoadingChatData, setIsLoadingChatData] = useState(false);
  const [userPreferredCollapsed, setUserPreferredCollapsed] = useState(false); // User's manual preference for desktop
  
  const { width: screenWidth } = useScreenSize();
  const isMobile = screenWidth < MOBILE_BREAKPOINT;

  // Load sidebar width and user preference from localStorage on mount
  useEffect(() => {
    const storedWidth = getStorageItem(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH);
    const storedPreference = getStorageItem(LOCAL_STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
    
    setSidebarWidth(storedWidth);
    setUserPreferredCollapsed(storedPreference);
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    if (isMobile) {
      // Always collapse on mobile
      setSidebarCollapsed(true);
    } else {
      // On desktop, use user's preference
      setSidebarCollapsed(userPreferredCollapsed);
    }
  }, [isMobile, userPreferredCollapsed]);

  const toggleSidebar = useCallback(() => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    
    // Only store preference if we're on desktop
    if (!isMobile) {
      setUserPreferredCollapsed(newCollapsed);
      setStorageItem(LOCAL_STORAGE_KEYS.SIDEBAR_COLLAPSED, newCollapsed);
    }
  }, [sidebarCollapsed, isMobile]);

  const updateSidebarWidth = useCallback((width: number) => {
    const clampedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
    setSidebarWidth(clampedWidth);
    setStorageItem(LOCAL_STORAGE_KEYS.SIDEBAR_WIDTH, clampedWidth);
  }, []);

  return {
    sidebarCollapsed,
    sidebarWidth,
    isLoadingChatData,
    isMobile,
    setSidebarCollapsed,
    setSidebarWidth: updateSidebarWidth,
    setIsLoadingChatData,
    toggleSidebar,
    minSidebarWidth: MIN_SIDEBAR_WIDTH,
    maxSidebarWidth: MAX_SIDEBAR_WIDTH,
  };
}; 