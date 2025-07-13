import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Trash2 } from "lucide-react";

interface DeleteChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteChat: () => void;
  isDeleting: boolean;
  chatTitle?: string;
}

export const DeleteChatModal = ({
  isOpen,
  onClose,
  onDeleteChat,
  isDeleting,
  chatTitle
}: DeleteChatModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-red-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-red-400">Delete Chat</DialogTitle>
          <DialogDescription className="text-white/60">
            Are you sure you want to delete "{chatTitle}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onDeleteChat}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                <span>Deleting...</span>
              </div>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 