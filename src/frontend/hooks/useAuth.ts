import type { CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/frontend/store";
import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";

const useAuth = () => {
  const { login, logout } = useAuthStore();
  const router = useRouter();
  const posthog = usePostHog();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const signIn = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setIsLoggingIn(true);
    posthog?.capture(ANALYTICS_EVENTS.AUTH_SIGN_IN_STARTED);
    try {
      await login({
        idToken: response.credential,
        sessionId: crypto.randomUUID(),
      });
      posthog?.capture(ANALYTICS_EVENTS.AUTH_SIGN_IN_SUCCEEDED);
      router.push("/home");
    } catch {
      posthog?.capture(ANALYTICS_EVENTS.AUTH_SIGN_IN_FAILED);
      setIsLoggingIn(false);
    }
  };
  const signOut = async () => {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  };
  return { signIn, signOut, isLoggingIn };
};
export default useAuth;
