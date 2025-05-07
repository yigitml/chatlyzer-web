import { NextRequest, NextResponse } from "next/server";
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
      include: { devices: true },
    });

    if (!user) {
      return ApiResponse.error("User not found", 401).toResponse();
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return ApiResponse.error("Token has been revoked", 401).toResponse();
    }

    const device = user.devices.find(
      (d: any) => d.deviceId === decoded.deviceId,
    );
    if (!device) {
      return ApiResponse.error("Device not found", 401).toResponse();
    }

    await prisma.userDevice.update({
      where: {
        userId_deviceId: {
          userId: user.id,
          deviceId: decoded.deviceId,
        },
      },
      data: {
        lastLoginAt: new Date(),
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
        deviceId: decoded.deviceId,
        isMobile: true,
        tokenVersion: user.tokenVersion,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" },
    );

    return ApiResponse.success({
      token: newJwtToken,
      expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }).toResponse();
  } catch (error: unknown) {
    console.error("Refresh token error:", error);
    return ApiResponse.error("Token refresh failed", 500).toResponse();
  }
}
