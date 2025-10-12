"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/frontend/store/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Button } from "@/frontend/components/ui/button";
import { AlertTriangle, LogIn, ArrowLeft, Skull, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, isInitialized, isAuthenticated } = useAuthStore();

  // Show loading while auth is initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen text-white bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Loading the chaos... ⚡</p>
        </div>
      </div>
    );
  }

  const handleLoginRedirect = () => {
    router.push("/auth/sign-in");
  };

  return (
    <div className="min-h-screen text-white bg-background">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Chatlyzer" width={32} height={32} className="w-8 h-8" />
          <span className="font-bold text-xl text-white relative after:content-[''] after:block after:h-0.5 after:w-full after:bg-gradient-to-r from-purple-400/40 to-pink-400/40 after:mt-1 after:rounded-full">Chatlyzer</span>
        </Link>

        <Button
          variant="outline"
          onClick={() => router.push(isAuthenticated ? "/home" : "/")}
          className="bg-white/10 hover:bg-white/20 border-purple-400/30 text-white backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isAuthenticated ? "Back to Dashboard" : "Back Home"}
        </Button>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-gray-400 bg-white/10 rounded-full px-4 py-2 mb-6 backdrop-blur-sm border border-gray-400/20">
              <Skull className="w-4 h-4" />
              <span>Danger zone ahead 💀</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About to
              <br />
              <span className="text-white relative after:content-[''] after:block after:h-1 after:w-full after:bg-gradient-to-r from-gray-400/20 to-gray-500/30 after:mt-1 after:rounded-full">delete everything</span> 🗑️
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              This is your last stop before yeeting your account into the void. No take-backs bestie 💔
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Authentication Check */}
            {!isAuthenticated || !user ? (
              <Card className="bg-black border-white/20 text-white">
                <CardHeader>
                  <CardTitle className="text-white">
                    <LogIn className="h-5 w-5 text-gray-400" />
                    Hold up - who are you? 🤔
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    You gotta prove you're you before we let you destroy anything fr
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-gradient-to-r from-gray-200/10 to-gray-500/10 border border-gray-400/20">
                      <h3 className="font-semibold mb-3 text-white">
                        Before you can nuke your account:
                      </h3>
                      <ul className="text-sm text-gray-300 space-y-2">
                        <li>• Sign in to verify it's actually you (not some random)</li>
                        <li>• Confirm you own this account (security things, you know)</li>
                        <li>• See exactly what's about to get deleted forever</li>
                      </ul>
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full bg-black border-white/20 text-white font-medium transition-all duration-200 hover:bg-white/10 hover:border-white/40 hover:text-white"
                        onClick={handleLoginRedirect}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Sign in to delete account
                      </Button>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        We promise this is the last hoop to jump through 🎪
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Authenticated User - Delete Account Section */
              <Card className="bg-red-500/5 border-red-500/30 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    Nuclear option activated ☢️
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    This will permanently delete your account and ALL your data. Like, gone gone. 
                    No "oops can I get it back" situations here bestie 💀
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-6 rounded-lg border-2 border-red-500/50 bg-gradient-to-r from-red-500/10 to-pink-500/10">
                      <h3 className="font-semibold mb-4 text-red-400 flex items-center gap-2">
                        <Skull className="w-5 h-5" />
                        What's getting yeeted into the void:
                      </h3>
                      <ul className="text-sm text-gray-300 space-y-2">
                        <li>💀 Your account profile and all settings</li>
                        <li>💀 Every single chat you've uploaded (all the tea)</li>
                        <li>💀 All your spicy analyses and insights</li>
                        <li>💀 Subscription details and payment info</li>
                        <li>💀 Credit balance and usage history</li>
                        <li>💀 Literally everything - it's all going to digital heaven</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/20">
                      <h3 className="font-semibold mb-2 text-purple-400">
                        Last chance to reconsider 🥺
                      </h3>
                      <p className="text-sm text-gray-300">
                        Maybe just take a break instead? Your data will be here when you come back. 
                        We won't judge if you change your mind - happens to the best of us 💜
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="destructive"
                        size="lg"
                        className="w-full bg-gradient-to-r from-red-500/70 to-pink-500/70 hover:from-red-500/80 hover:to-pink-500/80 transition-all duration-200 hover:scale-105 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        Delete everything forever 💥
                      </Button>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        This button is currently disabled - implementation pending (you're safe for now) 🛡️
                      </p>
                    </div>

                    {/* Quick Escape */}
                    <Card className="bg-white/5 border-gray-400/20">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-3">
                          <p className="text-sm text-gray-300">
                            Changed your mind? Smart choice bestie ✨
                          </p>
                          <Button
                            variant="outline"
                            className="bg-white/10 hover:bg-white/20 border-purple-400/30 text-white transition-all duration-200 hover:scale-105"
                            onClick={() => router.push("/home")}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Take me back to safety
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
