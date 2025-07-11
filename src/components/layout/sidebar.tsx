import { Chat } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ChatCard } from "@/components/chat/chat-card";
import { Plus, ChevronRight, ChevronLeft, MessageCircle } from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  onToggleCollapse,
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
  onTitleChange
}: SidebarProps) => {
  return (
    <div className={`transition-all duration-300 border-r border-white/10 bg-black z-50 ${
      isCollapsed 
        ? 'w-16' 
        : 'w-80 lg:w-80 md:w-72 sm:w-64 lg:relative fixed lg:translate-x-0'
    } ${isCollapsed ? '' : 'max-w-[80vw]'} ${!isCollapsed ? 'lg:relative fixed inset-y-0 left-0' : ''}`}>
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
            <Button 
              onClick={onCreateChat}
              className="w-full mb-6 bg-white/10 hover:bg-white/20 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>

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
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 text-sm">No chats yet</p>
                  <p className="text-white/40 text-xs">Create your first chat to get started</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 