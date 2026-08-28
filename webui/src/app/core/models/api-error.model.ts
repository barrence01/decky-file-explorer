export interface ApiErrorResponse {
  error: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload?: ApiErrorResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
