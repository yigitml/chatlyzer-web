import {
  User,
  UserCredit,
  Subscription,
  File,
  Message,
  Chat,
  AnalyticsResult,
} from "@prisma/client";

import {
  AuthWebPostRequest,
  UserPutRequest,
  ContactGetRequest,
  ContactPostRequest,
  ContactPutRequest,
  ContactDeleteRequest,
  MessageGetRequest,
  MessagePostRequest,
  MessagePutRequest,
  MessageDeleteRequest,
  ChatGetRequest,
  ChatPostRequest,
  ChatPutRequest,
  ChatDeleteRequest,
  AnalyticsResultPostRequest,
  AnalyticsResultPutRequest,
  AnalyticsResultDeleteRequest,
  AnalyticsResultGetRequest,
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

  analyticsResults: AnalyticsResult[];
  selectedAnalyticsResult: AnalyticsResult | null;

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

  fetchAnalyticsResults: (params?: AnalyticsResultGetRequest) => Promise<AnalyticsResult[]>;
  createAnalyticsResult: (data: AnalyticsResultPostRequest) => Promise<AnalyticsResult>;
  selectAnalyticsResult: (analyticsResult: AnalyticsResult) => Promise<void>;
  updateAnalyticsResult: (data: AnalyticsResultPutRequest) => Promise<AnalyticsResult>;
  deleteAnalyticsResult: (data: AnalyticsResultDeleteRequest) => Promise<void>;

  //createFile: (data: FormData) => Promise<File>;

  fetchCredits: () => Promise<UserCredit[]>;

  fetchSubscription: () => Promise<Subscription | null>;
}
