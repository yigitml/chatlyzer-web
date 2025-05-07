import { useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "@/store";

const useAuth = () => {
  const { login, logout } = useAuthStore();
  const router = useRouter();

  const signIn = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const sessionId = generateSessionId();
        await login({
          accessToken: codeResponse.access_token,
          sessionId: sessionId,
        });
        router.push("/home");
      } catch (error) {
        console.error("Sign in failed:", error);
        router.push("/auth/signin");
      }
    },
    flow: "implicit",
    scope: "openid email profile",
  });

  const signOut = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return { signIn, signOut };
};

const generateSessionId = (): string => {
  return uuidv4();
};

export default useAuth;
