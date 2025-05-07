export interface AuthWebPostRequest {
  accessToken: string;
  sessionId: string;
}

export interface AuthMobilePostRequest {
  accessToken: string;
  deviceId: string;
}

export interface FileGetRequest {
  id?: string;
}

export interface FilePostRequest {
  modelId: string;
  photoCount: number;
}

export interface FileDeleteRequest {
  id: string;
}

export interface ChatGetRequest {
  id?: string;
}

export interface ChatPostRequest {
  name: string;
  source: string;
  description?: string;
}

export interface ChatPutRequest {
  id: string;
  name?: string;
  description?: string;
}

export interface ChatDeleteRequest {
  id: string;
}

export interface AnalysisGetRequest {
  id?: string;
  chatId?: string;
}

export interface AnalysisPostRequest {
  chatId: string;
  type: string;
}

export interface AnalysisPutRequest {
  id: string;
  type: string;
}

export interface AnalysisDeleteRequest {
  id: string;
}

export interface MessageGetRequest {
  id?: string;
  chatId?: string;
}

export interface MessagePostRequest {
  content: string;
  timestamp?: Date;
  senderId: string;
  senderName: string;
  chatId: string;
  metadata?: any;
}

export interface MessagePutRequest {
  id: string;
  content?: string;
  metadata?: any;
}

export interface MessageDeleteRequest {
  id: string;
}

export interface ContactGetRequest {
  id?: string;
}

export interface ContactPostRequest {
  name: string;
  identifier: string;
  source: string;
}

export interface ContactPutRequest {
  id: string;
  name?: string;
  identifier?: string;
  source?: string;
}

export interface ContactDeleteRequest {
  id: string;
}

export interface SubscriptionGetRequest {
  id?: string;
}

export interface SubscriptionDeleteRequest {
  id: string;
}

export interface UserPostRequest {
  name: string;
}

export interface UserPutRequest {
  name?: string;
  image?: string;
  isOnboarded?: boolean;
  isFirstModelCreated?: boolean;
  isTourCompleted?: boolean;
}