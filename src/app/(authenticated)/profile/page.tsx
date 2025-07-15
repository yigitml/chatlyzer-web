"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/frontend/store/authStore";
import { useChatStore } from "@/frontend/store/chatStore";
import { useMessageStore } from "@/frontend/store/messageStore";
import { useAnalysisStore } from "@/frontend/store/analysisStore";
import { useCreditStore } from "@/frontend/store/creditStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/frontend/components/ui/avatar";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/frontend/components/ui/dialog";
import { 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  MessageCircle, 
  BarChart3, 
  Zap, 
  Crown, 
  Settings, 
  Edit2, 
  Save,
  X,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Shield,
  Trash2
} from "lucide-react";
import Link from "next/link";

// Components
const LoadingSpinner = ({ size = "sm" }: { size?: "sm" | "lg" }) => (
  <div className={`border-2 border-white/20 border-t-white rounded-full animate-spin ${size === "lg" ? "w-8 h-8" : "w-4 h-4"}`} />
);

const Toast = ({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) => (
  <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border ${
      type === "success" 
        ? "bg-green-500/20 border-green-500/30 text-green-300" 
        : "bg-red-500/20 border-red-500/30 text-red-300"
    }`}>
      {type === "success" ? (
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 flex-shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-auto p-1 text-white/60 hover:text-white"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  description 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  description?: string;
}) => (
  <Card className="bg-white/5 border-white/20">
    <CardContent className="p-6">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-purple-400" />
        <span className="text-white/60 text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value.toLocaleString()}</div>
      {description && (
        <div className="text-xs text-white/40">{description}</div>
      )}
    </CardContent>
  </Card>
);

const CreditsDisplay = ({ credits }: { credits: number }) => {
  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
      <Zap className="w-5 h-5 text-green-400 flex-shrink-0" />
      <span className="font-mono text-lg text-white whitespace-nowrap">{credits.toLocaleString()}</span>
    </div>
  );
};

export default function ProfilePage() {
  const { user, isInitialized, updateUser, setUser, deleteUser } = useAuthStore();
  const { chats, fetchChats } = useChatStore();
  const { messages, fetchMessages } = useMessageStore();
  const { analyzes, fetchAnalyzes } = useAnalysisStore();
  const { credits, subscription, fetchCredits, fetchSubscription } = useCreditStore();
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Stats
  const totalCredits = credits.reduce((sum, credit) => sum + credit.amount, 0);
  const totalChats = chats.length;
  const totalMessages = messages.length;
  const totalAnalyses = analyzes.length;
  
  // Toast system
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initialize edit form
  useEffect(() => {
    if (user) {
      setEditedName(user.name || "");
    }
  }, [user]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        await Promise.all([
          fetchChats(),
          fetchMessages({}),
          fetchAnalyzes({}),
          fetchCredits(),
          fetchSubscription()
        ]);
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      }
    };

    fetchData();
  }, [user, fetchChats, fetchMessages, fetchAnalyzes, fetchCredits, fetchSubscription]);

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }

    try {
      setIsUpdating(true);
      
      // Call the actual API to update the user profile
      const updatedUser = await updateUser({ name: editedName.trim() });
      
      // Update the user state with the updated data
      setUser(updatedUser);
      
      setIsEditing(false);
      showToast("Profile updated successfully ✨", "success");
    } catch (error) {
      console.error("Failed to update profile:", error);
      showToast("Failed to update profile", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUser();
      showToast("Account deletion initiated", "success");
      setIsDeleteModalOpen(false);
    } catch (error) {
      showToast("Failed to delete account", "error");
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="text-white/60 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not authenticated</h1>
          <Link href="/auth/sign-in" className="text-purple-400 hover:text-purple-300">
            Sign in to continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Back Button */}
        <Link href="/home" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back</span>
        </Link>

        {/* Profile Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-white/60">Manage your account and preferences</p>
        </div>

        {/* Profile Info Card */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                <AvatarFallback className="text-xl">
                  {user.name?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                {/* Name Row */}
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editedName.trim() && !isUpdating) {
                            handleSaveProfile();
                          } else if (e.key === 'Escape') {
                            setIsEditing(false);
                            setEditedName(user.name || "");
                          }
                        }}
                        className="bg-white/10 border-white/20 text-white text-xl font-semibold focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all flex-1"
                        placeholder="Enter your name..."
                        autoFocus
                      />
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={isUpdating || !editedName.trim()}
                        size="sm"
                        className="px-3"
                      >
                        {isUpdating ? <LoadingSpinner /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          setIsEditing(false);
                          setEditedName(user.name || "");
                        }}
                        size="sm"
                        disabled={isUpdating}
                        className="px-3"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">{user.name}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-white/60 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                {/* Static Info - Always Visible */}
                <div className="flex items-center gap-2 text-white/60">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                {user.lastLoginAt && (
                  <div className="flex items-center gap-2 text-white/60">
                    <Clock className="w-4 h-4" />
                    <span>Last active {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Statistics */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Account Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={MessageCircle}
              label="Total Chats"
              value={totalChats}
              description="Conversations analyzed"
            />
            <StatCard
              icon={BarChart3}
              label="Analyses Run"
              value={totalAnalyses}
              description="Insights generated"
            />
            <StatCard
              icon={Calendar}
              label="Days Active"
              value={Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
              description="Since joining"
            />
          </div>
        </div>

        {/* Credits & Subscription */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Credits & Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Available Credits</h3>
                <p className="text-white/60 text-sm">Use credits to run chat analyses</p>
              </div>
              <CreditsDisplay credits={totalCredits} />
            </div>
            
            {subscription ? (
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-white">{subscription.name}</h4>
                    <p className="text-white/60 text-sm">
                      {subscription.isActive ? "Active" : "Inactive"} • 
                      ${subscription.price}/month
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    subscription.isActive 
                      ? "bg-green-500/20 text-green-300 border border-green-500/30"
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}>
                    {subscription.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-white/60 mb-4">No active subscription</p>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="bg-white/5 border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="font-medium text-white">Account Status</h4>
                <p className="text-white/60 text-sm">Your account is {user.isActive ? "active" : "inactive"}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                user.isActive 
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}>
                {user.isActive ? "Active" : "Inactive"}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="font-medium text-white">Onboarding</h4>
                <p className="text-white/60 text-sm">
                  {user.isOnboarded ? "Completed" : "Not completed"}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                user.isOnboarded 
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              }`}>
                {user.isOnboarded ? "Complete" : "Pending"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-300 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white mb-1">Delete Account</h4>
                <p className="text-white/60 text-sm">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-black border-red-500/30 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-red-300">Delete Account</DialogTitle>
                    <DialogDescription className="text-white/60">
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteAccount}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}