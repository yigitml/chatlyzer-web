import { Chat } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Edit2, Check, X } from "lucide-react";

interface ChatCardProps {
  chat: Chat;
  isSelected: boolean;
  isEditing: boolean;
  editTitle: string;
  onSelect: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onTitleChange: (title: string) => void;
  isUpdating: boolean;
}

export const ChatCard = ({ 
  chat, 
  isSelected, 
  isEditing, 
  editTitle, 
  onSelect, 
  onEdit, 
  onSave, 
  onCancel, 
  onTitleChange, 
  isUpdating 
}: ChatCardProps) => (
  <div className={`group p-4 rounded-xl transition-all cursor-pointer ${
    isSelected ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'
  }`}>
    {isEditing ? (
      <div className="space-y-3">
        <Input
          value={editTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-white/10 border-white/20 text-white"
          placeholder="Chat title..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave} disabled={isUpdating || !editTitle.trim()}>
            {isUpdating ? <LoadingSpinner /> : <Check className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={isUpdating}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    ) : (
      <div onClick={onSelect}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white truncate">{chat.title || "Untitled Chat"}</h3>
            <p className="text-sm text-white/60 mt-1">
              {new Date(chat.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )}
  </div>
); 