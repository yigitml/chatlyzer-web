import {
  User,
  UserCredit,
  Subscription,
  Message,
  Chat,
  Analysis,
} from "@prisma/client";

import {
  AuthWebPostRequest,
  UserPutRequest,
  MessageGetRequest,
  MessagePostRequest,
  MessagePutRequest,
  MessageDeleteRequest,
  ChatGetRequest,
  ChatPostRequest,
  ChatPutRequest,
  ChatDeleteRequest,
  AnalysisPostRequest,
  AnalysisPutRequest,
  AnalysisDeleteRequest,
  AnalysisGetRequest,
} from "@/types/api/apiRequest";

export interface PhotoPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface AppContextType {
  isInitialized: boolean;
  error: Error | null;

  activeTab: string;
  tabs: { name: string; text: string[] }[];

  accessToken: string | null;
  user: User | null;

  credits: UserCredit[];
  subscription: Subscription | null;

  messages: Message[];
  selectedMessage: Message | null;

  chats: Chat[];
  selectedChat: Chat | null;

  analyzes: Analysis[];
  selectedAnalysis: Analysis | null;

  setActiveTab: (tab: string) => void;

  login: (data: AuthWebPostRequest) => Promise<User>;
  logout: () => Promise<void>;

  fetchUser: () => Promise<User>;
  updateUser: (data: UserPutRequest) => Promise<User>;

  fetchMessages: (params?: MessageGetRequest) => Promise<Message[]>;
  createMessage: (data: MessagePostRequest) => Promise<Message>;
  selectMessage: (message: Message) => Promise<void>;
  updateMessage: (data: MessagePutRequest) => Promise<Message>;
  deleteMessage: (data: MessageDeleteRequest) => Promise<boolean>;

  fetchChats: (params?: ChatGetRequest) => Promise<Chat[]>;
  createChat: (data: ChatPostRequest) => Promise<Chat>;
  selectChat: (chat: Chat) => Promise<void>;
  updateChat: (data: ChatPutRequest) => Promise<Chat>;
  deleteChat: (data: ChatDeleteRequest) => Promise<void>;

  fetchAnalyzes: (params?: AnalysisGetRequest) => Promise<Analysis[]>;
  createAnalysis: (data: AnalysisPostRequest) => Promise<Analysis>;
  selectAnalysis: (analysis: Analysis) => Promise<void>;
  updateAnalysis: (data: AnalysisPutRequest) => Promise<Analysis>;
  deleteAnalysis: (data: AnalysisDeleteRequest) => Promise<void>;

  fetchCredits: () => Promise<UserCredit[]>;

  fetchSubscription: () => Promise<Subscription | null>;
}