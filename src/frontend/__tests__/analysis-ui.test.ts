import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MainContent } from "@/frontend/components/layout/main-content";
import { ChatCard } from "@/frontend/components/chat/chat-card";
const base = {
  selectedChat: {
    id: "fixture",
    title: "Synthetic",
    isPrivacy: false,
    participants: [],
  } as never,
  selectedChatMessages: [],
  selectedChatAnalyzes: [],
  analysesByType: {} as never,
  selectedAnalysisType: null,
  isLoadingChatData: false,
  isAnalyzing: false,
  totalCredits: 24,
  hasInProgressAnalysis: false,
  onAnalyzeChat: () => {},
  onDeleteChat: () => {},
  onCreateChat: () => {},
  onSelectAnalysisType: () => {},
};
it("failed analysis rows expose the error and retry rather than an empty results area", () => {
  const html = renderToStaticMarkup(
    createElement(MainContent, {
      ...base,
      selectedChatAnalyzes: [
        { status: "FAILED", result: {}, error: "Provider unavailable" },
      ],
    }),
  );
  expect(html).toContain("Retry Analysis (8 credits)");
  expect(html).toContain('role="alert"');
  expect(html).toContain("Provider unavailable");
  expect(html).toContain('aria-label="Delete selected chat"');
});
it("privacy failures request a fresh import since their original messages are not saved", () => {
  const html = renderToStaticMarkup(
    createElement(MainContent, {
      ...base,
      selectedChat: {
        ...(base.selectedChat as object),
        isPrivacy: true,
      } as never,
      selectedChatAnalyzes: [{ status: "FAILED", result: {} }],
    }),
  );
  expect(html).toContain("Import messages again");
  expect(html).not.toContain("Retry Analysis (8 credits)");
});
it("chat selection is a named semantic keyboard button and edit controls have names", () => {
  const html = renderToStaticMarkup(
    createElement(ChatCard, {
      chat: { title: "Synthetic private title" } as never,
      isSelected: true,
      isEditing: false,
      editTitle: "",
      onSelect: () => {},
      onEdit: () => {},
      onSave: () => {},
      onCancel: () => {},
      onTitleChange: () => {},
      isUpdating: false,
      isPrivacy: false,
    }),
  );
  expect(html).toContain('type="button"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain("Synthetic private title");
  expect(html).toContain('aria-label="Edit chat title"');
  expect(html).toContain("ph-no-capture");
});
