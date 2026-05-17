import { AuthenticatedRequest } from "@/backend/middleware/combinedMiddleware";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { syncRevenueCatCreditsForUser } from "@/backend/lib/revenueCat";
import { ApiResponse } from "@/shared/types/api/apiResponse";

export const POST = withProtectedRoute(async (request: AuthenticatedRequest) => {
  try {
    const result = await syncRevenueCatCreditsForUser(request.user!.id);
    return ApiResponse.success(result).toResponse();
  } catch (error) {
    console.error("[RevenueCat] Failed to sync mobile purchases:", error);
    return ApiResponse.error("revenuecat_sync_failed", 500).toResponse();
  }
});
