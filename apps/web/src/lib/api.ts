import { createClient } from '@wl/api-client';

/**
 * Vite proxies /v1 and /public to the API in development, so the browser makes
 * same-origin requests and CORS never enters the picture locally.
 */
export const api = createClient({
  baseUrl: import.meta.env['VITE_API_BASE_URL'] ?? '',
  getAccessToken: () => {
    // Supabase Auth slots in here. Until it does, local development uses the
    // API's dev token, which the server refuses outright in production.
    const override = localStorage.getItem('wl.devUser');
    return `dev:${override ?? import.meta.env['VITE_DEV_USER'] ?? 'demo-user'}`;
  },
});
