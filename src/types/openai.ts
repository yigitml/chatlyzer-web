export interface AnalyzeImageRequest {
  image: Buffer;
  filename?: string;
  contentType?: string;
  maxTokens?: number;
}

export interface AnalyzeImageResponse {
  description: string;
  tags: string[];
}

export interface GenerateTextRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  n?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | MessageContent[];
}

export interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface Choice {
  text: string;
  index: number;
  logprobs: null | object;
  finish_reason: string;
}

export interface GenerateTextResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
