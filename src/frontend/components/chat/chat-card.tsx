import { Chat } from "../../../generated/client";
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
    p-3 rounded-none cursor-pointer transition-all duration-100 border-2 border-primary font-mono
    ${isSelected 
      ? 'bg-primary text-primary-foreground translate-x-1 translate-y-1 shadow-none' 
      : 'bg-card text-card-foreground hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-brutal active:translate-x-1 active:translate-y-1 active:shadow-none'
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
              className="text-sm rounded-none border-2 border-primary bg-background text-foreground"
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
            {isPrivacy && <Shield className="w-4 h-4 text-current flex-shrink-0" />}
            <p className="text-current text-sm font-bold uppercase tracking-wider truncate">
              {chat.title || "Untitled Chat"}
            </p>
          </div>
        )}
      </div>
      
      {!isEditing && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
          className="h-6 w-6 p-0 text-current opacity-50 hover:opacity-100"
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      )}
    </div>
    
    {isPrivacy && (
      <p className="text-current opacity-70 font-bold uppercase text-xs mt-1">Privacy Mode</p>
    )}
  </div>
);