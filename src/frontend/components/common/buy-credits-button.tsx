"use client";

import { Loader2, Zap } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { useCreditStore } from "@/frontend/store/creditStore";

interface BuyCreditsButtonProps {
  className?: string;
  variant?: "default" | "icon";
}

export const BuyCreditsButton = ({
  className = "",
  variant = "default",
}: BuyCreditsButtonProps) => {
  const purchaseCredits = useCreditStore((s) => s.purchaseCredits);
  const isPurchasing = useCreditStore((s) => s.isPurchasing);
  const handlePurchase = () => {
    void purchaseCredits().catch((error) => {
      if (error instanceof Error && error.name === "AbortError") return;
      window.alert(
        (error instanceof Error ? error.message : "Unable to start checkout.") +
          " If checkout completed, use Restore credits on your Profile page.",
      );
    });
  };

  if (variant === "icon") {
    return (
      <Button
        onClick={handlePurchase}
        disabled={isPurchasing}
        size="icon"
        className={`bg-gradient-to-br from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)] border border-cyan-400/50 transition-all duration-300 hover:scale-105 ${className}`}
        title="Buy credits"
        aria-label="Buy credits"
      >
        {isPurchasing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handlePurchase}
      disabled={isPurchasing}
      className={`bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400/50 transition-all duration-300 hover:scale-105 ${className}`}
    >
      {isPurchasing ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Zap className="w-4 h-4 mr-2" />
      )}
      {isPurchasing ? "Processing..." : "Buy 24 Credits"}
    </Button>
  );
};
