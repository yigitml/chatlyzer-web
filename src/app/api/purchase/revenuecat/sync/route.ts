import { AuthenticatedRequest } from "@/backend/middleware/combinedMiddleware";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { syncRevenueCatCreditsForUser } from "@/backend/lib/revenueCat";
import { apiErrorResponse } from "@/backend/lib/apiBoundary";
import { ApiResponse } from "@/shared/types/api/apiResponse";

export const POST = withRateLimiter(withProtectedRoute(async (request: AuthenticatedRequest) => {
  try {
    const result = await syncRevenueCatCreditsForUser(request.user!.id);
    return ApiResponse.success(result, result.pendingVerification ? "Purchase verification awaits the provider webhook" : "Purchases synchronized").toResponse();
  } catch (error) {
    return apiErrorResponse(error, "revenuecat_sync_failed");
  }
}));
