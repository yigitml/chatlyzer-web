import { AuthenticatedRequest } from "@/backend/middleware/combinedMiddleware";
import {
  getPolarMode,
  isPolarMode,
  setPolarMode,
} from "@/backend/lib/polarConfig";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { ApiResponse } from "@/shared/types/api/apiResponse";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export const GET = withProtectedRoute(async (request: AuthenticatedRequest) => {
  if (!isAdminEmail(request.user?.email)) {
    return ApiResponse.error("Forbidden", 403).toResponse();
  }

  const mode = await getPolarMode();
  return ApiResponse.success({ mode }).toResponse();
});

export const POST = withProtectedRoute(
  async (request: AuthenticatedRequest) => {
    if (!isAdminEmail(request.user?.email)) {
      return ApiResponse.error("Forbidden", 403).toResponse();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return ApiResponse.error("Invalid JSON body", 400).toResponse();
    }

    const mode =
      typeof body === "object" && body !== null && "mode" in body
        ? (body as { mode?: unknown }).mode
        : undefined;

    if (!isPolarMode(mode)) {
      return ApiResponse.error("Invalid Polar mode", 400).toResponse();
    }

    const updatedMode = await setPolarMode(mode);

    console.info("[Admin] Polar mode updated", {
      mode: updatedMode,
      adminEmail: request.user?.email,
    });

    return ApiResponse.success({ mode: updatedMode }).toResponse();
  },
);
