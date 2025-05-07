// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NextRequest } from "next/server";

declare module "next/server" {
  interface RequestUser {
    id: string;
    email?: string;
    isMobile?: boolean;
    deviceId?: string;
    tokenVersion?: number;
    sessionId?: string;
  }

  interface NextRequest {
    user?: RequestUser;
  }
}
