export type DirectoryErrorCode =
  | 'forbidden'
  | 'access_denied'
  | 'not_found'
  | 'not_directory'
  | 'invalid_name'
  | 'conflict';

export interface DirectoryErrorResponse {
  error: string;
  code?: DirectoryErrorCode;
  parentPath?: string | null;
  canNavigateUp?: boolean;
  files?: string[];
}

export interface ApiErrorResponse {
  error: string;
  code?: DirectoryErrorCode;
  parentPath?: string | null;
  canNavigateUp?: boolean;
  files?: string[];
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

  get code(): DirectoryErrorCode | undefined {
    return this.payload?.code;
  }

  get parentPath(): string | null | undefined {
    return this.payload?.parentPath;
  }

  get canNavigateUp(): boolean {
    return this.payload?.canNavigateUp ?? false;
  }
}
