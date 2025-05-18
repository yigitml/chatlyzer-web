import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/types/api/apiResponse";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    if (!refreshToken) {
      return ApiResponse.error("No refresh token provided", 401).toResponse();
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
    } catch {
      return ApiResponse.error("Invalid refresh token", 401).toResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { sessions: true },
    });

    if (!user) {
      return ApiResponse.error("User not found", 401).toResponse();
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return ApiResponse.error("Token has been revoked", 401).toResponse();
    }

    const session = user.sessions.find(
      (s: any) => s.sessionId === decoded.sessionId,
    );
    if (!session) {
      return ApiResponse.error("Session not found", 401).toResponse();
    }

    await prisma.userSession.update({
      where: {
        userId_sessionId: {
          userId: user.id,
          sessionId: decoded.sessionId,
        },
      },
      data: {
        lastActivityAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const newJwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        sessionId: decoded.sessionId,
        isMobile: false,
        tokenVersion: user.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    return ApiResponse.success({
      token: newJwtToken,
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    }).toResponse();
  } catch (error: unknown) {
    console.error("Refresh token error:", error);
    return ApiResponse.error("Token refresh failed", 500).toResponse();
  }
}
