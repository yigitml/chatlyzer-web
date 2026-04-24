import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/backend/lib/prisma";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import type { AuthWebPostRequest } from "@/shared/types/api/apiRequest";
import { withAuthRateLimiter } from "@/backend/middleware/rateLimiter";

export const POST = withAuthRateLimiter(async (request: NextRequest) => {
  try {
    const data: AuthWebPostRequest = await request.json();
    const { accessToken, sessionId } = data;

    if (
      !accessToken ||
      typeof accessToken !== "string" ||
      accessToken.length === 0
    ) {
      return ApiResponse.error("Invalid access token", 400).toResponse();
    }

    if (!sessionId || typeof sessionId !== "string" || sessionId.length < 8) {
      return ApiResponse.error("Invalid session ID", 400).toResponse();
    }

    const userInfoResponse = await fetch(
      `${process.env.GOOGLE_OAUTH2_URL}/userinfo`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!userInfoResponse.ok) {
      return ApiResponse.error("Failed to fetch user info", 401).toResponse();
    }

    const payload = await userInfoResponse.json();

    if (!payload.email || !payload.name) {
      return ApiResponse.error("Invalid user info", 401).toResponse();
    }

    let user;
    user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          googleId: payload.sub,
          image: payload.picture,
          tokenVersion: 0,
        },
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          name: "Free Plan",
          price: 0,
          durationDays: 30,
          createdAt: new Date(),
          isActive: true,
        },
      });
      await prisma.userCredit.create({
        data: {
          userId: user.id,
          type: "ANALYSIS",
          totalAmount: 128,
          amount: 0,
          subscriptionId: subscription.id,
        },
      });
    }

    await prisma.userSession.upsert({
      where: {
        userId_sessionId: {
          userId: user.id,
          sessionId: sessionId,
        },
      },
      update: {
        lastActivityAt: new Date(),
      },
      create: {
        userId: user.id,
        sessionId: sessionId,
        lastActivityAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        sessionId: sessionId,
        isMobile: false,
        tokenVersion: user.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        tokenVersion: user.tokenVersion,
      },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: "30d" },
    );

    const accessTokenMaxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    const isProduction = process.env.NODE_ENV === "production";
    const securePart = isProduction ? "; Secure" : "";

    const response = ApiResponse.success({
      token: jwtToken,
      expiresAt: Math.floor(Date.now() / 1000) + accessTokenMaxAge,
      user: user,
    }).toResponse();

    response.headers.append(
      "Set-Cookie",
      `accessToken=${jwtToken}; HttpOnly; Path=/; Max-Age=${accessTokenMaxAge}${securePart}; SameSite=Strict`
    );
    response.headers.append(
      "Set-Cookie",
      `refreshToken=${refreshToken}; HttpOnly; Path=/api/auth/web/refresh${securePart}; SameSite=Strict`
    );

    return response;
  } catch (error: any) {
    console.error("Web auth error:", error?.message || error);
    if (error?.code) console.error("Prisma error code:", error.code, "meta:", error?.meta);
    return ApiResponse.error("Authentication failed", 500).toResponse();
  }
});
