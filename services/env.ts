/**
 * Environment configuration for the application.
 * This file enforces that required environment variables are set.
 * If VITE_BACKEND_URL is not defined, the build will fail with a clear error.
 * Build: 2025-12-23 23:26 UTC
 */

console.log('BUILD CHECK - VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

if (!BACKEND_URL) {
    throw new Error(
        '❌ VITE_BACKEND_URL is not defined!\n\n' +
        'This environment variable must be set in Vercel for production builds.\n' +
        'Go to: Vercel → Settings → Environment Variables → Add VITE_BACKEND_URL\n\n' +
        'For local development, create a .env.local file with:\n' +
        'VITE_BACKEND_URL=http://localhost:8000'
    );
}
