"use client";

import { Zap } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { useCreditStore } from "@/frontend/store/creditStore";

interface BuyCreditsButtonProps {
  className?: string;
  variant?: "default" | "icon";
}

export const BuyCreditsButton = ({ className = "", variant = "default" }: BuyCreditsButtonProps) => {
  const purchaseCredits = useCreditStore((s) => s.purchaseCredits);

  if (variant === "icon") {
    return (
      <Button 
        onClick={() => purchaseCredits()}
        size="icon"
        className={`bg-gradient-to-br from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)] border border-cyan-400/50 transition-all duration-300 hover:scale-105 ${className}`}
        title="Buy Credits"
      >
        <Zap className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button 
      onClick={() => purchaseCredits()}
      className={`bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400/50 transition-all duration-300 hover:scale-105 ${className}`}
    >
      <Zap className="w-4 h-4 mr-2" />
      Buy 24 Credits
    </Button>
  );
};
