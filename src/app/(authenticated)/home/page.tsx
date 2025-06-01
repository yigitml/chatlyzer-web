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
import { Plus, X, FileText, Upload, Zap, Crown, Sparkles, TrendingUp, Heart, Ghost, AlertTriangle, CheckCircle, Brain, Star, BarChart3, Settings, LogOut, MessageCircle } from "lucide-react";
import { ChatPostRequest, AnalysisType } from "@/types/api/apiRequest";
import { convertChatExport, ChatPlatform } from "@/utils/messageConverter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";

// Helper function to get analysis descriptions and emojis
function getAnalysisInfo(analysisType: AnalysisType): { description: string; emoji: string; color: string } {
  const info: Record<AnalysisType, { description: string; emoji: string; color: string }> = {
    VibeCheck: { description: "Overall mood, energy, and social chemistry", emoji: "🔮", color: "from-cyan-500 to-blue-500" },
    ChatStats: { description: "Message counts, patterns, and statistics", emoji: "📊", color: "from-orange-500 to-red-500" },
    RedFlag: { description: "Toxic patterns and warning signs", emoji: "🚩", color: "from-red-500 to-pink-500" },
    GreenFlag: { description: "Healthy relationship indicators", emoji: "✅", color: "from-green-500 to-emerald-500" },
    SimpOMeter: { description: "One-sided romantic investment levels", emoji: "💕", color: "from-pink-500 to-rose-500" },
    GhostRisk: { description: "Likelihood of being left on read", emoji: "👻", color: "from-purple-500 to-violet-500" },
    MainCharacterEnergy: { description: "Dramatic flair and personality presence", emoji: "⭐", color: "from-yellow-500 to-amber-500" },
    EmotionalDepth: { description: "Vulnerability and genuine connection", emoji: "💙", color: "from-blue-500 to-indigo-500" }
  };
  return info[analysisType] || { description: "", emoji: "🔍", color: "from-gray-500 to-gray-600" };
}

// Helper function to extract analysis type from result JSON
function getAnalysisTypeFromResult(result: any): string {
  if (!result) return "Unknown";
  
  // Handle both object and string formats
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result);
      return parsed.type || parsed.analysisType || "Unknown";
    } catch {
      return "Unknown";
    }
  }
  
  // Handle object format
  return result.type || result.analysisType || "Unknown";
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

  // Get total credits
  const totalCredits = credits.reduce((sum, credit) => sum + credit.amount, 0);

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
      
      // Single API call that processes all analysis types
      await createAnalysis({ 
        chatId: selectedChatId
      });
      
      await fetchAnalyzes({ chatId: selectedChatId });
      setSuccessMessage(`All analyses complete! The full tea has been spilled ☕✨`);
      
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
      setErrorMessage("Chat title is required bestie");
      return;
    }

    try {
      setIsCreatingChat(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const chatData: ChatPostRequest = {
        title: chatTitle.trim(),
        messages: chatMessages.length > 0 ? chatMessages.map(msg => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp || new Date(),
          metadata: null
        } as any)) : undefined
      };

      const newChat = await createChat(chatData);
      await fetchChats();
      setSelectedChatId(newChat.id);
      await fetchMessages({ chatId: newChat.id });
      
      setChatTitle("");
      setChatMessages([]);
      setNewMessageSender("");
      setNewMessageContent("");
      setIsCreateChatModalOpen(false);
      
      setSuccessMessage("Chat created successfully! Ready for analysis ✨");
      
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
      const convertedMessages = convertChatExport(whatsappImportText, ChatPlatform.WHATSAPP);
      
      if (convertedMessages.length === 0) {
        setErrorMessage("No valid messages found in the WhatsApp export");
        return;
      }

      const formattedMessages = convertedMessages.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      setChatMessages(formattedMessages);
      
      const participants = [...new Set(formattedMessages.map(msg => msg.sender))];
      const participantNames = participants.slice(0, 2).join(" & ");
      const titleSuffix = participants.length > 2 ? ` + ${participants.length - 2} others` : "";
      const autoTitle = `WhatsApp: ${participantNames}${titleSuffix}`;
      
      setChatTitle(autoTitle);
      setSuccessMessage(`Imported ${convertedMessages.length} messages from WhatsApp! 🎉`);
      
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
    return (
      <div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Loading the vibes... ✨</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not authenticated bestie 💀</h1>
          <Link href="/auth/sign-in" className="text-purple-400 hover:text-purple-300">
            Sign in to continue
          </Link>
        </div>
      </div>
    );
  }

  const selectedChat = chats.find(chat => chat.id === selectedChatId);
  const selectedChatMessages = selectedChatId ? messages.filter(msg => msg.chatId === selectedChatId) : [];
  const selectedChatAnalyzes = selectedChatId ? analyzes.filter(analysis => analysis.chatId === selectedChatId) : [];

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Navigation */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/favicon.ico" alt="Chatlyzer" width={32} height={32} className="w-8 h-8" />
          <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Chatlyzer
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">{totalCredits} credits</span>
          </div>
          
          <Avatar>
            <AvatarImage src={user.image || ""} alt={user.name || "User"} />
            <AvatarFallback>{user.name?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-purple-300 bg-white/10 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>Welcome back {user.name?.split(' ')[0] || 'bestie'} ✨</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
              spill the tea?
            </span> ☕
          </h1>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Upload your chats, get the insights, avoid the red flags. It's giving main character energy 💅
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{chats.length}</p>
                  <p className="text-sm text-gray-400">Chats uploaded</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{analyzes.length}</p>
                  <p className="text-sm text-gray-400">Analyses completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{totalCredits}</p>
                  <p className="text-sm text-gray-400">Credits remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{subscription ? "Premium" : "Free"}</p>
                  <p className="text-sm text-gray-400">Current plan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chats Section */}
          <div className="lg:col-span-1">
            <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Your Chats 💬</CardTitle>
                <Dialog open={isCreateChatModalOpen} onOpenChange={setIsCreateChatModalOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      onClick={resetCreateChatForm}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-gray-900 border-purple-400/20 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-white">Upload New Chat ⚡</DialogTitle>
                      <DialogDescription className="text-gray-300">
                        Time to expose some conversations bestie. You can manually add messages or import from WhatsApp.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Chat Title */}
                      <div className="space-y-2">
                        <Label htmlFor="chat-title" className="text-white">Chat Title *</Label>
                        <Input
                          id="chat-title"
                          placeholder="Give this chat a name..."
                          value={chatTitle}
                          onChange={(e) => setChatTitle(e.target.value)}
                          className="bg-white/10 border-purple-400/30 text-white placeholder:text-gray-400"
                        />
                      </div>

                      {/* Import Mode Toggle */}
                      <div className="space-y-2">
                        <Label className="text-white">How are we doing this?</Label>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant={importMode === "manual" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setImportMode("manual")}
                            className={importMode === "manual" ? "bg-gradient-to-r from-purple-500 to-pink-500" : "border-purple-400/30 text-white hover:bg-white/10"}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Manual Entry
                          </Button>
                          <Button
                            type="button"
                            variant={importMode === "whatsapp" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setImportMode("whatsapp")}
                            className={importMode === "whatsapp" ? "bg-gradient-to-r from-purple-500 to-pink-500" : "border-purple-400/30 text-white hover:bg-white/10"}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            WhatsApp Import
                          </Button>
                        </div>
                      </div>

                      {/* WhatsApp Import Section */}
                      {importMode === "whatsapp" && (
                        <div className="space-y-2">
                          <Label htmlFor="whatsapp-import" className="text-white">WhatsApp Chat Export</Label>
                          <Textarea
                            id="whatsapp-import"
                            placeholder="Paste your WhatsApp chat export here...&#10;Example:&#10;11.04.25, 00:15 - John: Hello there&#10;11.04.25, 00:16 - Jane: Hi John!"
                            value={whatsappImportText}
                            onChange={(e) => setWhatsappImportText(e.target.value)}
                            rows={8}
                            className="font-mono text-sm bg-white/10 border-purple-400/30 text-white placeholder:text-gray-400"
                          />
                          <Button
                            type="button"
                            onClick={handleWhatsAppImport}
                            disabled={!whatsappImportText.trim()}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Parse WhatsApp Export ✨
                          </Button>
                        </div>
                      )}

                      {/* Manual Messages Section */}
                      {importMode === "manual" && (
                        <div className="space-y-2">
                          <Label className="text-white">Messages (Optional)</Label>
                        
                        {/* Existing Messages */}
                        {chatMessages.length > 0 && (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {chatMessages.map((message, index) => (
                              <div key={index} className="flex items-start space-x-2 p-2 bg-white/10 rounded border border-purple-400/20">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-purple-300">{message.sender}</p>
                                  <p className="text-sm text-gray-300">{message.content}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveMessage(index)}
                                  className="text-gray-400 hover:text-red-400"
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
                            className="bg-white/10 border-purple-400/30 text-white placeholder:text-gray-400"
                          />
                          <Input
                            placeholder="Message content..."
                            value={newMessageContent}
                            onChange={(e) => setNewMessageContent(e.target.value)}
                            className="bg-white/10 border-purple-400/30 text-white placeholder:text-gray-400"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleAddMessage}
                          disabled={!newMessageSender.trim() || !newMessageContent.trim()}
                          className="w-full border-purple-400/30 text-white hover:bg-white/10"
                        >
                          Add Message
                        </Button>
                        </div>
                      )}

                      {/* Error/Success Messages */}
                      {errorMessage && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
                          <p className="text-sm">{errorMessage}</p>
                        </div>
                      )}

                      {successMessage && (
                        <div className="p-3 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg">
                          <p className="text-sm">{successMessage}</p>
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateChatModalOpen(false)}
                        className="border-purple-400/30 text-white hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCreateChat}
                        disabled={!chatTitle.trim() || isCreatingChat}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        {isCreatingChat ? "Creating..." : "Create Chat ✨"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {chats.length > 0 ? (
                  <div className="space-y-3">
                    {chats.map(chat => (
                      <div 
                        key={chat.id} 
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
                          selectedChatId === chat.id 
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30' 
                            : 'bg-white/5 hover:bg-white/10 border border-gray-700'
                        }`}
                        onClick={() => setSelectedChatId(chat.id)}
                      >
                        <p className="font-medium text-white">{chat.title || "Untitled Chat"}</p>
                        <p className="text-sm text-gray-400">Created: {new Date(chat.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No chats uploaded yet</p>
                    <p className="text-sm text-gray-500">Upload your first chat to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analysis Section */}
          <div className="lg:col-span-2">
            {selectedChatId ? (
              <div className="space-y-6">
                {/* Analysis Controls */}
                <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Analyze: {selectedChat?.title} 🔍</CardTitle>
                    <CardDescription className="text-gray-300">
                      Get the full rundown - all vibes, stats, flags, and energy levels at once 💯
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {(["VibeCheck", "ChatStats", "RedFlag", "GreenFlag", "SimpOMeter", "GhostRisk", "MainCharacterEnergy", "EmotionalDepth"] as AnalysisType[]).map((analysisKey) => {
                          const info = getAnalysisInfo(analysisKey);
                          return (
                            <div key={analysisKey} className={`p-3 rounded-lg bg-gradient-to-r ${info.color} bg-opacity-20 border border-white/10 text-center`}>
                              <div className="text-lg mb-1">{info.emoji}</div>
                              <div className="text-xs text-white font-medium">
                                {analysisKey.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        onClick={handleAnalyzeChat}
                        disabled={isAnalyzing || totalCredits < 8}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 hover:scale-105 py-6 text-lg"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                            Analyzing all the vibes...
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5 mr-3" />
                            🔮 Run Full Analysis (8 credits)
                          </>
                        )}
                      </Button>

                      {totalCredits < 8 && (
                        <p className="text-sm text-red-400 text-center">
                          Need 8 credits for full analysis! Get more to continue 💸
                        </p>
                      )}

                      {/* Error/Success Messages */}
                      {errorMessage && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg">
                          <p className="text-sm font-medium">{errorMessage}</p>
                        </div>
                      )}
                      {successMessage && (
                        <div className="p-3 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg">
                          <p className="text-sm font-medium">{successMessage}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Chat Messages Preview */}
                <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Messages Preview 💬</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedChatMessages.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {selectedChatMessages.slice(0, 10).map(message => (
                          <div key={message.id} className="p-3 rounded-lg bg-white/5 border border-gray-700">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-medium text-sm text-purple-300">{message.sender}</p>
                              <p className="text-xs text-gray-500">{new Date(message.timestamp).toLocaleString()}</p>
                            </div>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{message.content}</p>
                          </div>
                        ))}
                        {selectedChatMessages.length > 10 && (
                          <p className="text-sm text-gray-400 text-center py-2">
                            ... and {selectedChatMessages.length - 10} more messages
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">No messages in this chat</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Analysis Results */}
                <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Analysis Results 📈</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedChatAnalyzes.length > 0 ? (
                      <div className="space-y-4">
                        {selectedChatAnalyzes.map(analysis => {
                          const analysisType = getAnalysisTypeFromResult(analysis.result);
                          const info = getAnalysisInfo(analysisType as AnalysisType);
                          
                          return (
                            <div key={analysis.id} className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/20">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{info.emoji}</span>
                                  <p className="font-medium text-white">{analysisType.replace(/([A-Z])/g, ' $1').trim()}</p>
                                </div>
                                <p className="text-xs text-gray-400">{new Date(analysis.createdAt).toLocaleString()}</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 border border-gray-700">
                                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                                  {JSON.stringify(analysis.result, null, 2)}
                                </pre>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">No analyses yet</p>
                        <p className="text-sm text-gray-500">Run an analysis to see the results here!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-white/5 border-purple-400/20 backdrop-blur-sm">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-4">Select a chat to analyze</h3>
                    <p className="text-gray-400 mb-6">
                      Choose a conversation from the left to start getting those insights ✨
                    </p>
                    <p className="text-sm text-gray-500">
                      Or upload a new chat to get started!
                    </p>
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