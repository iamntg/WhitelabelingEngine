import { ApiErrorBody } from './schemas/common.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ReadonlyArray<{ path: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True for the cases the web app should retry or revert optimistically. */
  get isTransient(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }

  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let code = `http_${response.status}`;
    let message = response.statusText || 'Request failed';
    let details: ReadonlyArray<{ path: string; message: string }> = [];

    try {
      const parsed = ApiErrorBody.safeParse(await response.json());
      if (parsed.success) {
        code = parsed.data.error.code;
        message = parsed.data.error.message;
        details = parsed.data.error.details ?? [];
      }
    } catch {
      // Non-JSON error bodies (proxy timeouts, HTML error pages) keep the
      // status-derived defaults above rather than masking the real status.
    }

    return new ApiError(response.status, code, message, details);
  }
}

/** Thrown when the network call itself never completed. */
export class NetworkError extends Error {
  constructor(public override readonly cause: unknown) {
    super('Could not reach the server');
    this.name = 'NetworkError';
  }
}
