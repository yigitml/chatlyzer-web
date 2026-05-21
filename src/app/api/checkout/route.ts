import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";

export const GET = withRateLimiter(async () => {
  return ApiResponse.error(
    "checkout_deprecated_use_mobile_revenuecat",
    410,
  ).toResponse();
});
