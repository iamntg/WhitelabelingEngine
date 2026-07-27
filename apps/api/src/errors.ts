/**
 * A single error shape across the API, matching `ApiErrorBody` in the client.
 * Anything thrown that is not an `HttpError` becomes a 500 with no detail
 * leaked to the caller.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ReadonlyArray<{ path: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'HttpError';
  }

  toBody() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details.length > 0 ? { details: [...this.details] } : {}),
      },
    };
  }
}

export const badRequest = (
  message: string,
  details?: ReadonlyArray<{ path: string; message: string }>,
) => new HttpError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Sign in to continue') =>
  new HttpError(401, 'unauthorized', message);

export const forbidden = (message = 'You do not have access to this brand') =>
  new HttpError(403, 'forbidden', message);

export const notFound = (message = 'Not found') => new HttpError(404, 'not_found', message);

export const conflict = (message: string) => new HttpError(409, 'conflict', message);

export const unprocessable = (
  code: string,
  message: string,
  details?: ReadonlyArray<{ path: string; message: string }>,
) => new HttpError(422, code, message, details);
