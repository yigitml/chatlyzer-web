import { apiErrorResponse } from "@/backend/lib/apiBoundary";
import { NextRequest } from "next/server";
import { withProtectedRoute } from "@/backend/middleware/jwtAuth";
import { withRateLimiter } from "@/backend/middleware/rateLimiter";
import { ApiResponse } from "@/shared/types/api/apiResponse";
import { reconcileAnalysisJobs } from "@/backend/lib/analysisJobs";
import { creditEnvironment } from "@/backend/lib/consumeUserCredits";
import prisma from "@/backend/lib/prisma";
import { getPagination, paginateResults, paginationHeaders } from "@/shared/utils/pagination";

export const GET = withRateLimiter(withProtectedRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    await reconcileAnalysisJobs(request.user!.id);
    const pagination = getPagination(searchParams);
    const credits = await prisma.userCredit.findMany({
      where: {
        userId: request.user!.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: pagination.take,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    });

    const page = paginateResults(credits, pagination.limit);
    const billingEnvironment = creditEnvironment();
    return ApiResponse.success(page.items.map(credit => {
      const productionAvailable = Math.max(0, credit.amount - credit.minimumBalance);
      const sandboxAvailable = billingEnvironment === "sandbox" ? Math.max(0, credit.sandboxAmount) : 0;
      return { ...credit, billingEnvironment, availableAmount: productionAvailable + sandboxAvailable,
        canAnalyze: productionAvailable >= 8 || sandboxAvailable >= 8 };
    })).toResponse(paginationHeaders(page.pageInfo));
  } catch (error) {
    return apiErrorResponse(error, "Failed to fetch user credits");
  }
}));
