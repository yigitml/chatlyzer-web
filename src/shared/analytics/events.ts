export const ANALYTICS_EVENTS = {
  AUTH_SIGN_IN_STARTED: "auth_sign_in_started",
  AUTH_SIGN_IN_SUCCEEDED: "auth_sign_in_succeeded",
  AUTH_SIGN_IN_FAILED: "auth_sign_in_failed",
  CHAT_CREATED: "chat_created",
  ANALYSIS_STARTED: "analysis_started",
  ANALYSIS_COMPLETED: "analysis_completed",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
