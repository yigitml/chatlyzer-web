"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useMessageStore } from "@/store/messageStore";
import { useAnalyticsResultStore } from "@/store/analyticsResultStore";
import { useCreditStore } from "@/store/creditStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserDashboard() {
  const { user, isInitialized } = useAuthStore();
  const { chats, fetchChats } = useChatStore();
  const { messages, fetchMessages } = useMessageStore();
  const { analyticsResults, fetchAnalyticsResults } = useAnalyticsResultStore();
  const { credits, subscription, fetchCredits, fetchSubscription } = useCreditStore();
  
  const dataFetchedRef = useRef(false);

  useEffect(() => {if (user && !dataFetchedRef.current) {
      dataFetchedRef.current = true;
      fetchChats();
      fetchCredits(); 
      fetchSubscription();
    }
  }, [user?.id]);

  if (!isInitialized) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Not authenticated</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">User Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                <AvatarFallback>{user.name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{user.name || "User"}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>User ID:</strong> {user.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Credits and Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Credits & Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">Credits</h3>
                {credits.length > 0 ? (
                  <ul className="space-y-2 mt-2">
                    {credits.map(credit => (
                      <li key={credit.id} className="flex justify-between">
                        <span>{credit.type}</span>
                        <span>{credit.amount}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 mt-2">No credits available</p>
                )}
              </div>
              
              <div>
                <h3 className="font-medium text-lg">Subscription</h3>
                {subscription ? (
                  <div className="mt-2">
                    <p><strong>Plan:</strong> {subscription.name}</p>
                    <p><strong>Status:</strong> {subscription.isActive ? "Active" : "Inactive"}</p>
                    <p><strong>Valid until:</strong> {new Date(subscription.createdAt).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 mt-2">No active subscription</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Chats</CardTitle>
          </CardHeader>
          <CardContent>
            {chats.length > 0 ? (
              <ul className="space-y-2">
                {chats.slice(0, 5).map(chat => (
                  <li key={chat.id} className="p-2 rounded bg-gray-100 dark:bg-gray-800">
                    <p className="font-medium">{chat.title || "Untitled Chat"}</p>
                    <p className="text-sm text-gray-500">Created: {new Date(chat.createdAt).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No chats available</p>
            )}
          </CardContent>
        </Card>

        {/* Messages Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Select a chat to view messages</p>
          </CardContent>
        </Card>

        {/* Analytics Results Card */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Select a chat to view analytics</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
