import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { ApiResponse } from "@/types/api/apiResponse";
import type { AuthMobilePostRequest } from "@/types/api/apiRequest";

export async function POST(request: NextRequest) {
  try {
    const data: AuthMobilePostRequest = await request.json();
    const { accessToken, deviceId } = data;

    if (
      !accessToken ||
      typeof accessToken !== "string" ||
      accessToken.length === 0
    ) {
      return ApiResponse.error("Invalid access token", 400).toResponse();
    }

    if (!deviceId || typeof deviceId !== "string" || deviceId.length < 8) {
      return ApiResponse.error("Invalid device ID", 400).toResponse();
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

    let user = await prisma.user.findUnique({
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
          lastLoginAt: new Date(),
        },
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          name: "Free",
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
          totalAmount: 1,
          amount: 0,
          subscriptionId: subscription.id,
        },
      });
    }

    await prisma.userDevice.upsert({
      where: {
        userId_deviceId: {
          userId: user.id,
          deviceId: deviceId,
        },
      },
      update: {
        lastLoginAt: new Date(),
      },
      create: {
        userId: user.id,
        deviceId: deviceId,
        lastLoginAt: new Date(),
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
        deviceId: deviceId,
        isMobile: true,
        tokenVersion: user.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" },
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        deviceId: deviceId,
        tokenVersion: user.tokenVersion,
      },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: "30d" },
    );

    return ApiResponse.success({
      token: jwtToken,
      expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.image,
      },
    }).toResponse({
      "Set-Cookie": `refreshToken=${refreshToken}; HttpOnly; Path=/api/auth/mobile/refresh; Secure; SameSite=Strict`,
    });
  } catch (error: any) {
    console.error("Mobile auth error:", error);
    return ApiResponse.error("Authentication failed", 500).toResponse();
  }
}
