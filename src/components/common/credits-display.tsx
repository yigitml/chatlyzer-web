import { Zap } from "lucide-react";

interface CreditsDisplayProps {
  credits: number;
}

export const CreditsDisplay = ({ credits }: CreditsDisplayProps) => {
  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
      <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
      <span className="font-mono text-sm text-white whitespace-nowrap">{credits.toLocaleString()}</span>
    </div>
  );
}; 