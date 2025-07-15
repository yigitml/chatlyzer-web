import { Chat } from "@prisma/client";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { LoadingSpinner } from "@/frontend/components/common/loading-spinner";
import { Edit2, Check, X, Shield } from "lucide-react"; // Add Shield import

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
  isPrivacy: boolean;
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
  isUpdating,
  isPrivacy
}: ChatCardProps) => (
  <div className={`
    p-3 rounded-lg cursor-pointer transition-all duration-200 border
    ${isSelected 
      ? 'bg-white/10 border-white/30' 
      : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
    }
  `}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancel();
                }
              }}
              className="text-sm bg-white/10 border-white/20 text-white"
              autoFocus
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={onSave}
                disabled={isUpdating}
                className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
              >
                {isUpdating ? <LoadingSpinner size="sm" /> : <Check className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div onClick={onSelect} className="flex items-center gap-2">
            {isPrivacy && <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />}
            <p className="text-white text-sm font-medium truncate">
              {chat.title || "Untitled Chat"}
            </p>
          </div>
        )}
      </div>
      
      {!isEditing && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="h-6 w-6 p-0 text-white/40 hover:text-white/60"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      )}
    </div>
    
    {isPrivacy && (
      <p className="text-green-400 text-xs mt-1">Privacy Mode</p>
    )}
  </div>
);