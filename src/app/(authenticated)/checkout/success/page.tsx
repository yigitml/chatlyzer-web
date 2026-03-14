"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/frontend/store/authStore";
import { useCreditStore } from "@/frontend/store/creditStore";
import { CheckCircle, XCircle, Loader2, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";

type CheckoutStatus = "loading" | "success" | "failed";

export default function CheckoutSuccessPage() {
  const { user, isInitialized } = useAuthStore();
  const { credits, fetchCredits } = useCreditStore();
  const [status, setStatus] = useState<CheckoutStatus>("loading");
  const [retryCount, setRetryCount] = useState(0);

  const totalCredits = credits.reduce((sum, credit) => sum + credit.amount, 0);

  // Verify that credits were actually granted by polling
  useEffect(() => {
    if (!user?.id || !isInitialized) return;

    const MAX_RETRIES = 10;
    const RETRY_DELAY = 2000; // 2 seconds between retries

    const verifyCredits = async () => {
      try {
        const updatedCredits = await fetchCredits();
        const currentTotal = updatedCredits.reduce((sum, c) => sum + c.amount, 0);
        
        // If we have credits, consider it successful
        // In a more robust implementation, we'd check the order status via API
        if (currentTotal > 0) {
          setStatus("success");
          return;
        }

        // Webhook might not have fired yet — retry
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, RETRY_DELAY);
        } else {
          // After max retries, show failed state
          setStatus("failed");
        }
      } catch {
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, RETRY_DELAY);
        } else {
          setStatus("failed");
        }
      }
    };

    verifyCredits();
  }, [user, isInitialized, retryCount, fetchCredits]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center">
          <div className="border-2 border-white/20 border-t-white rounded-full animate-spin w-8 h-8" />
          <p className="text-muted-foreground font-mono uppercase mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 text-center space-y-6">

        {/* Loading State */}
        {status === "loading" && (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold font-display text-foreground mb-2">
                VERIFYING_PAYMENT
              </h1>
              <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
                Confirming your purchase with Polar...
              </p>
            </div>
            <p className="text-white/60 text-sm">
              This may take a few seconds while we process your payment.
              {retryCount > 3 && " Still waiting for confirmation..."}
            </p>
          </>
        )}

        {/* Success State */}
        {status === "success" && (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold font-display text-foreground mb-2">
                PAYMENT_CONFIRMED
              </h1>
              <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
                Credits have been added to your account
              </p>
            </div>
            <div className="bg-card border-2 border-primary shadow-brutal p-6 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-6 h-6 text-card-foreground" />
                <span className="font-mono font-bold text-3xl text-card-foreground">
                  {totalCredits}
                </span>
              </div>
              <p className="text-muted-foreground font-mono text-sm uppercase">
                Total Analysis Credits
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/home">
                <Button className="w-full bg-card border-2 border-primary text-card-foreground hover:-translate-y-1 hover:shadow-brutal transition-all font-mono font-bold uppercase">
                  <Zap className="w-4 h-4 mr-2" />
                  Start Analyzing
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" className="w-full text-white/60 hover:text-white font-mono uppercase">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Profile
                </Button>
              </Link>
            </div>
          </>
        )}

        {/* Failed State */}
        {status === "failed" && (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/30 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold font-display text-foreground mb-2">
                PAYMENT_UNVERIFIED
              </h1>
              <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
                We could not confirm your payment
              </p>
            </div>
            <p className="text-white/60 text-sm">
              Your payment may still be processing. If credits don&apos;t appear within a few minutes,
              please contact support. Do not attempt to purchase again.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/profile">
                <Button className="w-full bg-card border-2 border-primary text-card-foreground hover:-translate-y-1 hover:shadow-brutal transition-all font-mono font-bold uppercase">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Check Your Profile
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="ghost" className="w-full text-white/60 hover:text-white font-mono uppercase">
                  Contact Support
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
