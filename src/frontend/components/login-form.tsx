"use client";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
interface LoginFormProps {
  onSignIn: (response: CredentialResponse) => void;
  title?: string;
  description?: string;
  buttonText?: string;
  isLoading?: boolean;
  compact?: boolean;
}
export function LoginForm({
  onSignIn,
  title = "Welcome",
  description = "Continue with Google to sign in or create an account",
  isLoading = false,
}: LoginFormProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {isLoading ? (
          <p role="status">Signing in...</p>
        ) : (
          <GoogleLogin
            onSuccess={onSignIn}
            onError={() => {}}
            useOneTap={false}
          />
        )}
      </CardContent>
    </Card>
  );
}
