import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { rawPrisma } from "./prisma";
import { lockActiveAccount } from "./accountLock";
import { ApiError } from "./apiBoundary";
import { getRequiredServerEnv } from "@/shared/config/env";
import type { verifyGoogleIdToken } from "./verifyGoogleIdToken";

type Identity = Awaited<ReturnType<typeof verifyGoogleIdToken>>;
export async function login(identity: Identity, identifier: string, mobile: boolean) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await rawPrisma.$transaction(async tx => {
        let user = await tx.user.findUnique({ where: { googleId: identity.id } });
        if (!user) {
          const legacy = await tx.user.findUnique({ where: { email: identity.email } });
          if (legacy?.googleId && legacy.googleId !== identity.id) throw new ApiError("Google identity does not match account", 401);
          user = legacy ? await tx.user.update({ where: { id: legacy.id }, data: { googleId: identity.id } }) :
            await tx.user.create({ data: { email: identity.email, name: identity.name, googleId: identity.id, image: identity.picture } });
        }
        await lockActiveAccount(tx, user.id);
        const subscription = await tx.subscription.upsert({ where: { userId: user.id }, update: {},
          create: { userId: user.id, name: "Free Plan", price: 0, durationDays: 30, isActive: true } });
        await tx.userCredit.upsert({ where: { userId_type: { userId: user.id, type: "ANALYSIS" } }, update: {},
          create: { userId: user.id, type: "ANALYSIS", totalAmount: 128, amount: 0, subscriptionId: subscription.id } });
        const loginGeneration = randomUUID();
        const now = new Date();
        const session = mobile ? await tx.userDevice.upsert({
          where: { userId_deviceId: { userId: user.id, deviceId: identifier } },
          update: { loginGeneration, deletedAt: null, lastLoginAt: now, refreshTokenVersion: { increment: 1 } },
          create: { userId: user.id, deviceId: identifier, loginGeneration, lastLoginAt: now },
        }) : await tx.userSession.upsert({
          where: { userId_sessionId: { userId: user.id, sessionId: identifier } },
          update: { loginGeneration, deletedAt: null, lastActivityAt: now, refreshTokenVersion: { increment: 1 } },
          create: { userId: user.id, sessionId: identifier, loginGeneration, lastActivityAt: now },
        });
        user = await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: now } });
        return { user, loginGeneration, refreshTokenVersion: session.refreshTokenVersion };
      });
    } catch (error) {
      if (attempt < 2 && error && typeof error === "object" && "code" in error && error.code === "P2002") continue;
      throw error;
    }
  }
}

export function tokens(user: { id: string; email: string; tokenVersion: number }, identifier: string, mobile: boolean, loginGeneration: string, refreshTokenVersion: number) {
  const claims = { userId: user.id, tokenVersion: user.tokenVersion, isMobile: mobile, loginGeneration,
    ...(mobile ? { deviceId: identifier } : { sessionId: identifier }) };
  return {
    token: jwt.sign({ ...claims, email: user.email }, getRequiredServerEnv("JWT_SECRET"), { expiresIn: "15m" }),
    refreshToken: jwt.sign({ ...claims, refreshTokenVersion }, getRequiredServerEnv("REFRESH_TOKEN_SECRET"), { expiresIn: "30d" }),
  };
}
export function refreshCookie(token: string, mobile: boolean, maxAge = 30 * 86400) {
  return `refreshToken=${token}; HttpOnly; Path=/api/auth/${mobile ? "mobile" : "web"}/refresh; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}; SameSite=Strict`;
}
export function accessCookie(token: string, maxAge = 900) {
  return `accessToken=${token}; HttpOnly; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}; SameSite=Strict`;
}

export async function rotate(refreshToken: string, mobile: boolean) {
  let claims: jwt.JwtPayload;
  try {
    const value = jwt.verify(refreshToken, getRequiredServerEnv("REFRESH_TOKEN_SECRET"), { algorithms: ["HS256"] });
    if (typeof value === "string") throw new Error();
    claims = value;
  } catch { throw new ApiError("Invalid refresh token", 401); }
  const identifier = mobile ? claims.deviceId : claims.sessionId;
  if (claims.isMobile !== mobile || typeof claims.userId !== "string" || typeof identifier !== "string" ||
    typeof claims.loginGeneration !== "string" || !Number.isInteger(claims.refreshTokenVersion) || !Number.isInteger(claims.tokenVersion)) {
    throw new ApiError("Invalid refresh token", 401);
  }
  return rawPrisma.$transaction(async tx => {
    await lockActiveAccount(tx, claims.userId, claims.tokenVersion);
    const where = { userId: claims.userId, deletedAt: null, loginGeneration: claims.loginGeneration, refreshTokenVersion: claims.refreshTokenVersion };
    const updated = mobile ? await tx.userDevice.updateMany({ where: { ...where, deviceId: identifier },
      data: { refreshTokenVersion: { increment: 1 }, lastLoginAt: new Date() } }) :
      await tx.userSession.updateMany({ where: { ...where, sessionId: identifier },
        data: { refreshTokenVersion: { increment: 1 }, lastActivityAt: new Date() } });
    if (updated.count !== 1) throw new ApiError("Refresh token has been revoked or rotated", 401);
    const user = await tx.user.findUniqueOrThrow({ where: { id: claims.userId } });
    return tokens(user, identifier, mobile, claims.loginGeneration, claims.refreshTokenVersion + 1);
  });
}
