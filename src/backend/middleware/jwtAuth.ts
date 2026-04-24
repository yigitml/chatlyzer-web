import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import prisma from "@/backend/lib/prisma";
import {
  AuthenticatedRequest,
  combineMiddleware,
  MiddlewareHandler,
} from "./combinedMiddleware";

export function jwtAuth(): MiddlewareHandler {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get("Authorization");
    let token: string | undefined;

    // Mobile clients send Bearer token in Authorization header
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Web clients use HttpOnly cookie
    if (!token) {
      token = req.cookies.get("accessToken")?.value;
    }

    if (!token) {
      return ApiResponse.error("Unauthorized", 401).toResponse();
    }

    let decoded: any;
    try {
      decoded = verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
    } catch {
      return ApiResponse.error("Invalid token", 401).toResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return ApiResponse.error("User not found", 401).toResponse();
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return ApiResponse.error("Token has been revoked", 401).toResponse();
    }

    // Per-session/device revocation check
    if (decoded.isMobile && decoded.deviceId) {
      const device = await prisma.userDevice.findFirst({
        where: { userId: user.id, deviceId: decoded.deviceId, deletedAt: null },
      });
      if (!device) {
        return ApiResponse.error("Device session revoked", 401).toResponse();
      }
    } else if (decoded.sessionId) {
      const session = await prisma.userSession.findFirst({
        where: { userId: user.id, sessionId: decoded.sessionId, deletedAt: null },
      });
      if (!session) {
        return ApiResponse.error("Session revoked", 401).toResponse();
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      isMobile: decoded.isMobile,
      sessionId: decoded.sessionId,
      deviceId: decoded.deviceId,
      tokenVersion: user.tokenVersion,
    };

    return NextResponse.next({
      request: req,
    });
  };
}

export const withProtectedRoute = (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) =>
  combineMiddleware(jwtAuth())(handler);