import { Button } from "@/frontend/components/ui/button";
import { ChatCard } from "@/frontend/components/chat/chat-card";
import { Plus, ChevronRight, ChevronLeft, MessageCircle, Shield } from "lucide-react";
import { Chat } from "@prisma/client";
import { useCallback, useRef, useState } from "react";

interface SidebarProps {
  isCollapsed: boolean;
  width: number;
  onToggleCollapse: () => void;
  onWidthChange: (width: number) => void;
  minWidth: number;
  maxWidth: number;
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  editingChatId: string | null;
  editingTitle: string;
  isUpdatingTitle: boolean;
  onEditChat: (chatId: string, title: string) => void;
  onSaveEdit: (chatId: string) => void;
  onCancelEdit: () => void;
  onTitleChange: (title: string) => void;
  // Make these optional to avoid errors
  onCreatePrivacyAnalysis?: () => void;
  isPrivacyMode?: boolean;
  onTogglePrivacyMode?: (isPrivacy: boolean) => void;
}

export const Sidebar = ({
  isCollapsed,
  width,
  onToggleCollapse,
  onWidthChange,
  minWidth,
  maxWidth,
  chats,
  selectedChatId,
  onSelectChat,
  onCreateChat,
  editingChatId,
  editingTitle,
  isUpdatingTitle,
  onEditChat,
  onSaveEdit,
  onCancelEdit,
  onTitleChange,
  onCreatePrivacyAnalysis,
  isPrivacyMode,
}: SidebarProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCollapsed) return;
    
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      
      const rect = resizeRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isCollapsed, minWidth, maxWidth, onWidthChange]);

  return (
    <div 
      ref={resizeRef}
      className={`transition-all duration-300 border-r border-white/10 bg-black z-50 relative ${
        isCollapsed 
          ? 'w-16' 
          : 'lg:relative fixed lg:translate-x-0'
      } ${isCollapsed ? '' : 'max-w-[80vw]'} ${!isCollapsed ? 'lg:relative fixed inset-y-0 left-0' : ''}`}
      style={{ 
        width: isCollapsed ? '64px' : `${width}px`,
        transition: isResizing ? 'none' : undefined 
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-white">Your Chats</h2>
              <p className="text-sm text-white/60">{chats.length} conversations</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="text-white/60 hover:text-white"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {!isCollapsed && (
          <>
            <div className="flex flex-col gap-2 mb-6">
              {!isPrivacyMode && (
                <Button 
                  onClick={onCreateChat}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              )}
              
              <Button 
                onClick={onCreatePrivacyAnalysis}
                className="w-full bg-white/5 hover:bg-white/10 text-green-400 border border-green-400/30"
              >
                <Shield className="w-4 h-4 mr-2" />
                Privacy Analysis
              </Button>
            </div>

            {/* Privacy Mode Info */}
            {isPrivacyMode && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Privacy Mode</span>
                </div>
                <p className="text-green-300 text-xs">
                  Messages are analyzed but never stored
                </p>
              </div>
            )}

            {/* Chats List */}
            <div className="space-y-2">
              {chats.length > 0 ? (
                chats.map(chat => (
                  <ChatCard
                    key={chat.id}
                    chat={chat}
                    isSelected={selectedChatId === chat.id}
                    isEditing={editingChatId === chat.id}
                    editTitle={editingTitle}
                    onSelect={() => onSelectChat(chat.id)}
                    onEdit={() => onEditChat(chat.id, chat.title || "")}
                    onSave={() => onSaveEdit(chat.id)}
                    onCancel={onCancelEdit}
                    onTitleChange={onTitleChange}
                    isUpdating={isUpdatingTitle}
                    isPrivacy={chat.isPrivacy || false}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 text-sm">
                    {isPrivacyMode ? "No privacy analyses yet" : "No chats yet"}
                  </p>
                  <p className="text-white/40 text-xs">
                    {isPrivacyMode 
                      ? "Create your first privacy analysis" 
                      : "Create your first chat to get started"
                    }
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-white/50 transition-colors ${
            isResizing ? 'bg-white' : ''
          }`}
          onMouseDown={handleMouseDown}
          style={{ zIndex: 10 }}
        />
      )}
    </div>
  );
}; 