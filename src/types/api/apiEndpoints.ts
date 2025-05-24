export const API_ENDPOINTS = {
  TOKEN: "/auth/web",
  REFRESH: "/auth/web/refresh",
  LOGOUT: "/auth/web/logout",
  USER: "/user",
  CHAT: "/chat",
  MESSAGE: "/message",
  ANALYSIS: "/analysis",
  FILE: "/file",
  SUBSCRIPTION: "/subscription",
  CREDIT: "/credit",
} as const;

export const LOCAL_STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  EXPIRES_AT: "expiresAt",
} as const;
