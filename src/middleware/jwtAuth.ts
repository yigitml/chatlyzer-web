import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { ApiResponse } from "@/types/api/apiResponse";
import prisma from "@/lib/prisma";
import {
  AuthenticatedRequest,
  combineMiddleware,
  MiddlewareHandler,
} from "./combinedMiddleware";

export function jwtAuth(): MiddlewareHandler {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.error("Unauthorized", 401).toResponse();
    }

    const token = authHeader.split(" ")[1];

    let decoded: any;
    try {
      decoded = verify(token, process.env.JWT_SECRET!);
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

export const withProtectedRoute = (
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
) => {
  return combineMiddleware(jwtAuth(), async (req: AuthenticatedRequest) =>
    handler(req),
  );
};
