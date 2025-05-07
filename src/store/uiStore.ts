import { create } from "zustand";

export interface Tab {
  name: string;
  text: string[];
}

interface UIState {
  activeTab: string;
  tabs: Tab[];
  prompt: string;
  isInitialized: boolean;
}

interface UIActions {
  setActiveTab: (tab: string) => void;
  setPrompt: (prompt: string) => void;
  initialize: () => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => {
  const tabs: Tab[] = [
    { name: "Camera", text: ["AI", "Magic"] },
    { name: "Prompts", text: ["AI", "Prompts"] },
    { name: "Models", text: ["Your", "Models"] },
    { name: "Packs", text: ["Photo", "Packs"] },
    { name: "Deleted", text: ["Deleted", "Photos"] },
  ];

  return {
    activeTab: "Camera",
    tabs,
    prompt: "",
    isInitialized: false,

    setActiveTab: (tab) => set({ activeTab: tab }),
    setPrompt: (prompt) => set({ prompt }),
    initialize: () => {
      if (typeof window !== "undefined") {
        const savedTab = localStorage.getItem("activeTab");
        if (savedTab) {
          set({ activeTab: savedTab });
        }
      }
      set({ isInitialized: true });
    },
  };
});
