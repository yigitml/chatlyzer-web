import { useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "@/store";
import { useEffect, useCallback, useState } from "react";

const useAuth = () => {
  const { login, logout } = useAuthStore();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const resetLoadingState = useCallback(() => {
    setIsLoggingIn(false);
  }, [setIsLoggingIn]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const sessionId = generateSessionId();
        await login({ accessToken: codeResponse.access_token, sessionId });
        router.push("/home");
      } catch (error) {
        console.error("Sign in failed:", error);
        resetLoadingState();
        router.push("/auth/sign-in");
      }
    },
    onError: resetLoadingState,
    onNonOAuthError: resetLoadingState,
    flow: "implicit",
    scope: "openid email profile",
  });

  const signIn = () => {
    setIsLoggingIn(true);
    googleLogin();
  };

  const signOut = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return { signIn, signOut, isLoggingIn };
};

const generateSessionId = (): string => {
  return uuidv4();
};

export default useAuth;
