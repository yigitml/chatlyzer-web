import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/types/api/apiResponse";
import type { AuthWebPostRequest } from "@/types/api/apiRequest";

export async function POST(request: NextRequest) {
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
          amount: 8,
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

    return NextResponse.json(
      ApiResponse.success({
        token: jwtToken,
        expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
        },
      }),
      {
        headers: {
          "Set-Cookie": `refreshToken=${refreshToken}; HttpOnly; Path=/api/auth/web/refresh; Secure; SameSite=Strict`,
        },
      },
    );
  } catch (error: unknown) {
    console.error("Web auth error:", error);
    return NextResponse.json(ApiResponse.error("Authentication failed", 500));
  }
}
