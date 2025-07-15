import { cn } from "@/shared/utils/utils";

interface StatusBadgeProps {
  variant: "success" | "error" | "default";
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge = ({ variant, children, className }: StatusBadgeProps) => {
  const variantClasses = {
    success: "bg-green-500/20 text-green-300 border-green-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
    default: "bg-white/10 text-white/80 border-white/20"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}; 