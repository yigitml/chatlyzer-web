"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useMessageStore } from "@/store/messageStore";
import { useAnalysisStore } from "@/store/analysisStore";
import { useCreditStore } from "@/store/creditStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, FileText } from "lucide-react";
import { ChatPostRequest, MessagePostRequest, AnalysisType } from "@/types/api/apiRequest";
import { convertChatExport, ChatPlatform } from "@/utils/messageConverter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper function to get analysis descriptions
function getAnalysisDescription(analysisType: AnalysisType): string {
  const descriptions: Record<AnalysisType, string> = {
    VibeCheck: "Analyzes overall mood, energy, humor, and social chemistry of the conversation.",
    ChatStats: "Provides comprehensive statistics including message counts, emoji usage, and conversation patterns.",
    RedFlag: "Identifies potentially problematic patterns like manipulation, gaslighting, or toxic behavior.",
    GreenFlag: "Highlights positive relationship signs like respect, healthy boundaries, and good communication.",
    SimpOMeter: "Measures signs of excessive romantic pursuit, one-sided effort, or unbalanced investment.",
    GhostRisk: "Predicts likelihood of being ghosted based on engagement patterns and response quality.",
    MainCharacterEnergy: "Analyzes dramatic flair, storytelling ability, and standout personality moments.",
    EmotionalDepth: "Evaluates emotional intelligence, vulnerability, and genuine connection depth."
  };
  return descriptions[analysisType] || "";
}

export default function UserDashboard() {
  const hasFetchedData = useRef(false);
  
  const { user, isInitialized } = useAuthStore();
  const { chats, fetchChats, createChat } = useChatStore();
  const { messages, fetchMessages } = useMessageStore();
  const { analyzes, fetchAnalyzes, createAnalysis } = useAnalysisStore();
  const { credits, subscription, fetchCredits, fetchSubscription } = useCreditStore();
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Create Chat Modal State
  const [isCreateChatModalOpen, setIsCreateChatModalOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [chatMessages, setChatMessages] = useState<{ sender: string; content: string; timestamp?: Date }[]>([]);
  const [newMessageSender, setNewMessageSender] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  
  // WhatsApp Import State
  const [whatsappImportText, setWhatsappImportText] = useState("");
  const [importMode, setImportMode] = useState<"manual" | "whatsapp">("manual");
  
  // Analysis State
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType>("VibeCheck");

  useEffect(() => {
    const fetchData = async () => {
      if (hasFetchedData.current) {
        return;
      }
      
      try {
        hasFetchedData.current = true;
        await Promise.all([
          fetchChats(),
          fetchAnalyzes(),
          fetchCredits(),
          fetchSubscription()
        ]);
      } catch (error) {
        hasFetchedData.current = false;
        const message = error instanceof Error ? error.message : "Failed to load data";
        console.error('Error fetching initial data:', error);
        setErrorMessage(message);
      }
    };

    if (user && user.id) {
      fetchData();
    }
    
    return () => {
    };
  }, [user, fetchChats, fetchAnalyzes, fetchCredits, fetchSubscription]);

  useEffect(() => {
    if (!selectedChatId) {
      return;
    }
    
    const fetchChatData = async () => {
      try {
        await Promise.all([
          fetchMessages({ chatId: selectedChatId }),
          fetchAnalyzes({ chatId: selectedChatId })
        ]);
        setErrorMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load chat data";
        console.error('Error fetching chat data:', error);
        setErrorMessage(message);
      }
    };

    fetchChatData();
  }, [selectedChatId, fetchMessages, fetchAnalyzes]);
  
  const handleAnalyzeChat = async () => {
    if (!selectedChatId) return;
    
    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await createAnalysis({ 
        chatId: selectedChatId,
        analysisType: selectedAnalysisType
      });
      // Refetch analyses after creating a new one
      await fetchAnalyzes({ chatId: selectedChatId });
      setSuccessMessage(`${selectedAnalysisType} analysis has been created successfully`);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze chat";
      console.error('Error analyzing chat:', error);
      setErrorMessage(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddMessage = () => {
    if (!newMessageSender.trim() || !newMessageContent.trim()) return;
    
    const newMessage = {
      sender: newMessageSender.trim(),
      content: newMessageContent.trim(),
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setNewMessageSender("");
    setNewMessageContent("");
  };

  const handleRemoveMessage = (index: number) => {
    setChatMessages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateChat = async () => {
    if (!chatTitle.trim()) {
      setErrorMessage("Chat title is required");
      return;
    }

    try {
      setIsCreatingChat(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Prepare the chat data according to ChatPostRequest
      const chatData: ChatPostRequest = {
        title: chatTitle.trim(),
        messages: chatMessages.length > 0 ? chatMessages.map(msg => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp || new Date(),
          metadata: null
        } as any)) : undefined
      };

      // Create the chat
      const newChat = await createChat(chatData);
      
      // Refresh chats list
      await fetchChats();
      
      // Select the newly created chat
      setSelectedChatId(newChat.id);
      
      // Fetch messages for the newly created chat
      await fetchMessages({ chatId: newChat.id });
      
      // Reset form and close modal
      setChatTitle("");
      setChatMessages([]);
      setNewMessageSender("");
      setNewMessageContent("");
      setIsCreateChatModalOpen(false);
      
      setSuccessMessage("Chat created successfully");
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create chat";
      console.error('Error creating chat:', error);
      setErrorMessage(message);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleWhatsAppImport = () => {
    if (!whatsappImportText.trim()) {
      setErrorMessage("Please paste WhatsApp chat export text");
      return;
    }

    try {
      // Convert WhatsApp text to messages
      const convertedMessages = convertChatExport(whatsappImportText, ChatPlatform.WHATSAPP);
      
      if (convertedMessages.length === 0) {
        setErrorMessage("No valid messages found in the WhatsApp export");
        return;
      }

      // Convert to our internal format
      const formattedMessages = convertedMessages.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      setChatMessages(formattedMessages);
      
      // Auto-generate title from first few participants or use date range
      const participants = [...new Set(formattedMessages.map(msg => msg.sender))];
      const participantNames = participants.slice(0, 2).join(" & ");
      const titleSuffix = participants.length > 2 ? ` + ${participants.length - 2} others` : "";
      const autoTitle = `WhatsApp Chat: ${participantNames}${titleSuffix}`;
      
      setChatTitle(autoTitle);
      setSuccessMessage(`Imported ${convertedMessages.length} messages from WhatsApp export`);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse WhatsApp export";
      console.error('Error parsing WhatsApp export:', error);
      setErrorMessage(message);
    }
  };

  const resetCreateChatForm = () => {
    setChatTitle("");
    setChatMessages([]);
    setNewMessageSender("");
    setNewMessageContent("");
    setWhatsappImportText("");
    setImportMode("manual");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Chats</CardTitle>
            <Dialog open={isCreateChatModalOpen} onOpenChange={setIsCreateChatModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetCreateChatForm}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Chat</DialogTitle>
                  <DialogDescription>
                    Create a new chat conversation. You can manually add messages or import from WhatsApp.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Chat Title */}
                  <div className="space-y-2">
                    <Label htmlFor="chat-title">Chat Title *</Label>
                    <Input
                      id="chat-title"
                      placeholder="Enter chat title..."
                      value={chatTitle}
                      onChange={(e) => setChatTitle(e.target.value)}
                    />
                  </div>

                  {/* Import Mode Toggle */}
                  <div className="space-y-2">
                    <Label>Message Input Method</Label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={importMode === "manual" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setImportMode("manual")}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Manual Entry
                      </Button>
                      <Button
                        type="button"
                        variant={importMode === "whatsapp" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setImportMode("whatsapp")}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        WhatsApp Import
                      </Button>
                    </div>
                  </div>

                  {/* WhatsApp Import Section */}
                  {importMode === "whatsapp" && (
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-import">WhatsApp Chat Export</Label>
                      <Textarea
                        id="whatsapp-import"
                        placeholder="Paste your WhatsApp chat export here...&#10;Example:&#10;11.04.25, 00:15 - John: Hello there&#10;11.04.25, 00:16 - Jane: Hi John!"
                        value={whatsappImportText}
                        onChange={(e) => setWhatsappImportText(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        onClick={handleWhatsAppImport}
                        disabled={!whatsappImportText.trim()}
                        className="w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Parse WhatsApp Export
                      </Button>
                    </div>
                  )}

                  {/* Manual Messages Section */}
                  {importMode === "manual" && (
                    <div className="space-y-2">
                      <Label>Initial Messages (Optional)</Label>
                    
                    {/* Existing Messages */}
                    {chatMessages.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {chatMessages.map((message, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{message.sender}</p>
                              <p className="text-sm text-gray-600">{message.content}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveMessage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Message */}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Sender name..."
                        value={newMessageSender}
                        onChange={(e) => setNewMessageSender(e.target.value)}
                      />
                      <Input
                        placeholder="Message content..."
                        value={newMessageContent}
                        onChange={(e) => setNewMessageContent(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddMessage}
                      disabled={!newMessageSender.trim() || !newMessageContent.trim()}
                      className="w-full"
                    >
                      Add Message
                    </Button>
                    </div>
                  )}

                  {/* Current Messages Preview */}
                  {chatMessages.length > 0 && (
                    <div className="space-y-2">
                      <Label>Current Messages ({chatMessages.length})</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                        {chatMessages.slice(0, 10).map((message, index) => (
                          <div key={index} className="flex items-start space-x-2 p-2 bg-white rounded border">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-600">{message.sender}</p>
                              <p className="text-sm text-gray-700">{message.content}</p>
                              {message.timestamp && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {message.timestamp.toLocaleString()}
                                </p>
                              )}
                            </div>
                            {importMode === "manual" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveMessage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {chatMessages.length > 10 && (
                          <p className="text-sm text-gray-500 text-center py-2">
                            ... and {chatMessages.length - 10} more messages
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error/Success Messages */}
                  {errorMessage && (
                    <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded">
                      <p className="text-sm">{errorMessage}</p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateChatModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateChat}
                    disabled={!chatTitle.trim() || isCreatingChat}
                  >
                    {isCreatingChat ? "Creating..." : "Create Chat"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {chats.length > 0 ? (
              <ul className="space-y-2">
                {chats.slice(0, 5).map(chat => (
                  <li 
                    key={chat.id} 
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedChatId === chat.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedChatId(chat.id)}
                  >
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
            {selectedChatId ? (
              messages.length > 0 ? (
                <ul className="space-y-2">
                  {messages.map(message => (
                    <li key={message.id} className="p-2 rounded bg-gray-100 dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-sm">{message.sender}</p>
                        <p className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No messages in this chat</p>
              )
            ) : (
              <p className="text-gray-500">Select a chat to view messages</p>
            )}
          </CardContent>
        </Card>

        {/* Analyzes Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between mb-4">
              <CardTitle>Analyzes</CardTitle>
              <Button
                size="sm"
                disabled={!selectedChatId || isAnalyzing}
                onClick={handleAnalyzeChat}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Chat'}
              </Button>
            </div>
            
            {/* Analysis Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="analysis-type">Analysis Type</Label>
              <Select
                value={selectedAnalysisType}
                onValueChange={(value: AnalysisType) => setSelectedAnalysisType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select analysis type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VibeCheck">🔮 Vibe Check - Overall mood & energy</SelectItem>
                  <SelectItem value="ChatStats">📊 Chat Stats - Comprehensive statistics</SelectItem>
                  <SelectItem value="RedFlag">🚩 Red Flag - Warning signs & toxic patterns</SelectItem>
                  <SelectItem value="GreenFlag">✅ Green Flag - Positive relationship signs</SelectItem>
                  <SelectItem value="SimpOMeter">💕 Simp-O-Meter - Romantic pursuit analysis</SelectItem>
                  <SelectItem value="GhostRisk">👻 Ghost Risk - Likelihood of being ghosted</SelectItem>
                  <SelectItem value="MainCharacterEnergy">⭐ Main Character Energy - Personality presence</SelectItem>
                  <SelectItem value="EmotionalDepth">💙 Emotional Depth - Vulnerability & connection</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {getAnalysisDescription(selectedAnalysisType)}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded">
                <p className="text-sm font-medium">Error: {errorMessage}</p>
              </div>
            )}
            {successMessage && (
              <div className="mb-3 p-2 bg-green-50 border border-green-200 text-green-700 rounded">
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
            )}
            {selectedChatId ? (
              analyzes.filter(analysis => analysis.chatId === selectedChatId).length > 0 ? (
                <ul className="space-y-2">
                  {analyzes
                    .filter(analysis => analysis.chatId === selectedChatId)
                    .map(analysis => (
                      <li key={analysis.id} className="p-2 rounded bg-gray-100 dark:bg-gray-800">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-sm">Analysis</p>
                          <p className="text-xs text-gray-500">{new Date(analysis.createdAt).toLocaleString()}</p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{JSON.stringify(analysis.result)}</p>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-gray-500">No analyzes for this chat</p>
              )
            ) : (
              <p className="text-gray-500">Select a chat to view analyzes</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}