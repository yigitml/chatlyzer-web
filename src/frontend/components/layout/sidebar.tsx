import { Button } from "@/frontend/components/ui/button";
import { ChatCard } from "@/frontend/components/chat/chat-card";
import { Plus, ChevronRight, ChevronLeft, MessageCircle } from "lucide-react";
import { Chat } from "../../../generated/client/browser";
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
      className={`transition-all duration-300 border-r-2 border-primary bg-card z-50 relative ${
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
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-primary">
          {!isCollapsed && (
            <div>
              <h2 className="font-bold font-mono uppercase tracking-wider text-card-foreground">Your Chats</h2>
              <p className="text-xs font-mono uppercase text-muted-foreground">{chats.length} {chats.length == 1 ? 'conversation' : 'conversations'}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {!isCollapsed && (
          <>
            <div className="mb-6">
              <Button 
                onClick={onCreateChat}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>

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
                <div className="text-center py-12 border-2 border-primary bg-background shadow-brutal-sm mt-4 p-4">
                  <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-mono font-bold uppercase tracking-widest text-sm mb-1">No chats yet</p>
                  <p className="text-muted-foreground font-mono text-xs uppercase text-balance">Create your first chat to get started</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary transition-colors ${
            isResizing ? 'bg-primary' : ''
          }`}
          onMouseDown={handleMouseDown}
          style={{ zIndex: 10 }}
        />
      )}
    </div>
  );
}; 