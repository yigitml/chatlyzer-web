import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/api/apiResponse";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    isMobile?: boolean;
    sessionId?: string;
    deviceId?: string;
    tokenVersion?: number;
  };
}

export type MiddlewareHandler = (
  request: AuthenticatedRequest,
) => Promise<NextResponse> | NextResponse;

export function combineMiddleware(...middlewares: MiddlewareHandler[]) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const url = req.nextUrl.clone();
      if (url.protocol !== "https:") {
        // TODO: Fix this
        // return NextResponse.redirect(url);
      }

      let currentRequest = req as AuthenticatedRequest;
      let result: NextResponse = NextResponse.next();

      for (const middleware of middlewares) {
        result = await middleware(currentRequest);
        if (result.status !== 200 && result.status !== 201) {
          return result;
        }

        const modifiedRequest = (result as any).request as AuthenticatedRequest;
        if (modifiedRequest) {
          currentRequest = modifiedRequest;
        }
      }

      result.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';",
      );

      return result;
    } catch (error) {
      console.error("Middleware error:", error);
      return NextResponse.json(ApiResponse.error("Internal server error", 500));
    }
  };
}
