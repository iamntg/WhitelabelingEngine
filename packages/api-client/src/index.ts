/**
 * @wl/api-client — the wire contract plus a typed client over it.
 *
 * The Zod schemas live here rather than inside apps/api so that the server and
 * both clients validate against one definition. apps/api imports these to
 * validate requests and to generate its OpenAPI document; apps/web and
 * apps/mobile import the same schemas to parse responses.
 */

export * from './schemas/index.js';
export { createClient, type ApiClient, type ClientOptions, type Cached } from './client.js';
export { ApiError, NetworkError } from './errors.js';
