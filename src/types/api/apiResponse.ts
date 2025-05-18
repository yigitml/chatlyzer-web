import { NextResponse } from "next/server";

export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public statusCode: number,
    public data?: T,
    public error?: string,
    public message?: string,
  ) {}

  static success<T>(
    data?: T,
    message?: string,
    statusCode = 200,
  ): ApiResponse<T> {
    return new ApiResponse<T>(true, statusCode, data, undefined, message);
  }

  static error<T>(error: string, statusCode = 400): ApiResponse<T> {
    return new ApiResponse<T>(false, statusCode, undefined, error);
  }

  toResponse(headers?: Record<string, string>): NextResponse {
    return NextResponse.json(
      { success: this.success, error: this.error, data: this.data, message: this.message },
      { status: this.statusCode, headers: headers },
    );
  }
}
