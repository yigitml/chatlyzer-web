import { createApiClient, ApiClient } from "@/lib/api";
import {
  AuthWebPostRequest,
  UserPutRequest,
  FileGetRequest,
  FilePostRequest,
  FileDeleteRequest,
  ChatGetRequest,
  ChatPostRequest,
  ChatPutRequest,
  ChatDeleteRequest,
  MessageGetRequest,
  MessagePostRequest,
  MessagePutRequest,
  MessageDeleteRequest,
  AnalysisGetRequest,
  AnalysisPostRequest,
  AnalysisPutRequest,
  AnalysisDeleteRequest,
  ContactGetRequest,
  ContactPostRequest,
  ContactPutRequest,
  ContactDeleteRequest,
  SubscriptionGetRequest,
  SubscriptionDeleteRequest,
} from "@/types/api/apiRequest";
import { API_ENDPOINTS } from "@/types/api/apiEndpoints";
import {
  User,
  UserCredit,
  Subscription,
  File,
  Chat,
  Message,
  Analysis,
  Contact,
} from "@prisma/client";
import { PhotoPagination } from "@/types/app";
import { AnalyzeImageResponse } from "@/types/openai";

/**
 * Network layer that provides typed API requests using our API client
 */
export class NetworkService {
  private api: ApiClient;

  constructor(getToken: () => string | null) {
    this.api = createApiClient(getToken);
  }

  // ===== Auth API =====

  async login(
    data: AuthWebPostRequest,
  ): Promise<{ user: User; token: string; expiresAt: string }> {
    const response = await this.api.post(API_ENDPOINTS.TOKEN, data);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.api.post(API_ENDPOINTS.LOGOUT);
  }

  async refreshToken(): Promise<{ token: string; expiresAt: string }> {
    const response = await this.api.post(API_ENDPOINTS.REFRESH);
    return response.data;
  }

  // ===== User API =====

  async fetchUser(): Promise<User> {
    const response = await this.api.get(API_ENDPOINTS.USER);
    return response.data;
  }

  async updateUser(data: UserPutRequest): Promise<User> {
    const response = await this.api.put(API_ENDPOINTS.USER, data);
    return response.data;
  }

  // ===== File API =====

  async fetchFiles(params?: FileGetRequest): Promise<File[]> {
    const response = await this.api.get(API_ENDPOINTS.FILE, params);
    return response.data;
  }

  async createFile(data: FormData): Promise<File> {
    const response = await this.api.post(API_ENDPOINTS.FILE, data);
    return response.data;
  }

  async deleteFile(data: FileDeleteRequest): Promise<void> {
    await this.api.delete(API_ENDPOINTS.FILE, data);
  }

  // ===== Chat API =====

  async fetchChats(params?: ChatGetRequest): Promise<Chat[]> {
    const response = await this.api.get(API_ENDPOINTS.CHAT, params);
    return response.data;
  }

  async createChat(data: ChatPostRequest): Promise<Chat> {
    const response = await this.api.post(API_ENDPOINTS.CHAT, data);
    return response.data;
  }

  async updateChat(data: ChatPutRequest): Promise<Chat> {
    const response = await this.api.put(API_ENDPOINTS.CHAT, data);
    return response.data;
  }

  async deleteChat(data: ChatDeleteRequest): Promise<void> {
    await this.api.delete(API_ENDPOINTS.CHAT, data);
  }

  // ===== Message API =====

  async fetchMessages(params?: MessageGetRequest): Promise<Message[]> {
    const response = await this.api.get(API_ENDPOINTS.MESSAGE, params);
    return response.data;
  }

  async createMessage(data: MessagePostRequest): Promise<Message> {
    const response = await this.api.post(API_ENDPOINTS.MESSAGE, data);
    return response.data;
  }

  async updateMessage(data: MessagePutRequest): Promise<Message> {
    const response = await this.api.put(API_ENDPOINTS.MESSAGE, data);
    return response.data;
  }

  async deleteMessage(data: MessageDeleteRequest): Promise<void> {
    await this.api.delete(API_ENDPOINTS.MESSAGE, data);
  }

  // ===== Analysis API =====

  async fetchAnalyses(params?: AnalysisGetRequest): Promise<Analysis[]> {
    const response = await this.api.get(API_ENDPOINTS.ANALYSIS, params);
    return response.data;
  }

  async createAnalysis(data: AnalysisPostRequest): Promise<Analysis> {
    const response = await this.api.post(API_ENDPOINTS.ANALYSIS, data);
    return response.data;
  }

  async updateAnalysis(data: AnalysisPutRequest): Promise<Analysis> {
    const response = await this.api.put(API_ENDPOINTS.ANALYSIS, data);
    return response.data;
  }

  async deleteAnalysis(data: AnalysisDeleteRequest): Promise<void> {
    await this.api.delete(API_ENDPOINTS.ANALYSIS, data);
  }

  // ===== Contact API =====

  async fetchContacts(params?: ContactGetRequest): Promise<Contact[]> {
    const response = await this.api.get(API_ENDPOINTS.CONTACT, params);
    return response.data;
  }

  async createContact(data: ContactPostRequest): Promise<Contact> {
    const response = await this.api.post(API_ENDPOINTS.CONTACT, data);
    return response.data;
  }

  async updateContact(data: ContactPutRequest): Promise<Contact> {
    const response = await this.api.put(API_ENDPOINTS.CONTACT, data);
    return response.data;
  }

  async deleteContact(data: ContactDeleteRequest): Promise<void> {
    await this.api.delete(API_ENDPOINTS.CONTACT, data);
  }

  // ===== Credit API =====

  async fetchCredits(): Promise<UserCredit[]> {
    const response = await this.api.get(API_ENDPOINTS.CREDIT);
    return response.data;
  }

  // ===== Subscription API =====

  async fetchSubscription(): Promise<Subscription> {
    const response = await this.api.get(API_ENDPOINTS.SUBSCRIPTION);
    return response.data;
  }

  async deleteSubscription(data: SubscriptionDeleteRequest): Promise<void> {
    await this.api.delete(API_ENDPOINTS.SUBSCRIPTION, data);
  } 
}
/**
 * Creates a network service using the provided token getter
 */
export const createNetworkService = (
  getToken: () => string | null,
): NetworkService => {
  return new NetworkService(getToken);
}
