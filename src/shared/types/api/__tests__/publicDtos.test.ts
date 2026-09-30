import { describe, expect, it } from "vitest";
import { toPublicUser } from "../publicDtos";

describe("public DTOs", () => {
  it("omits internal user fields from public user responses", () => {
    const publicUser = toPublicUser({
      id: "user_1",
      name: "Test User",
      email: "user@example.com",
      image: null,
      isOnboarded: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
      lastLoginAt: null,
      tokenVersion: 7,
      googleId: "google-id",
      polarCustomerId: "polar-customer",
      deletedAt: null,
      isActive: true,
    } as any);

    expect(publicUser).toEqual({
      id: "user_1",
      name: "Test User",
      email: "user@example.com",
      image: null,
      isOnboarded: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      lastLoginAt: null,
    });
    expect(publicUser).not.toHaveProperty("tokenVersion");
    expect(publicUser).not.toHaveProperty("googleId");
    expect(publicUser).not.toHaveProperty("polarCustomerId");
    expect(publicUser).not.toHaveProperty("deletedAt");
    expect(publicUser).not.toHaveProperty("isActive");
  });
});
