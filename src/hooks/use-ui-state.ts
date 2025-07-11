import { useState } from "react";

export const useUIState = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoadingChatData, setIsLoadingChatData] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return {
    sidebarCollapsed,
    isLoadingChatData,
    setSidebarCollapsed,
    setIsLoadingChatData,
    toggleSidebar
  };
}; 