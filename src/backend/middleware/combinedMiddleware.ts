import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/shared/types/api/apiResponse";

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

export function combineMiddleware(
  ...middlewares: MiddlewareHandler[]
): (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => (req: NextRequest) => Promise<NextResponse> {
  return (handler) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      let currentRequest = req as AuthenticatedRequest;

      for (const middleware of middlewares) {
        const result = await middleware(currentRequest);

        // If middleware returns anything other than NextResponse.next(), short-circuit
        if (!result || result.status !== 200) {
          return result;
        }

        const modifiedRequest = (result as any).request as AuthenticatedRequest;
        if (modifiedRequest) {
          currentRequest = modifiedRequest;
        }
      }

      return handler(currentRequest);
    };
  };
}