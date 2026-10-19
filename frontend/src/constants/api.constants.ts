/**
 * Where the API server itself runs (Render in production, `npm run server`
 * locally). Used directly only for what can't go through the /api rewrite:
 * the Google sign-in redirect (its security cookie lives on this site) and
 * the Socket.IO connection. Override with REACT_APP_API_ORIGIN.
 */
export const API_ORIGIN =
  process.env.REACT_APP_API_ORIGIN ||
  (process.env.NODE_ENV === "production" ? "https://vibechat-177v.onrender.com" : "http://localhost:4000");

/**
 * Base URL for API calls. Empty = the page's own site: Vercel rewrites /api/*
 * to Render (frontend/vercel.json) and the dev server proxies it locally
 * ("proxy" in package.json). The refresh cookie is therefore first-party, so
 * browsers that block third-party cookies (Safari, Brave) keep it.
 * Override with REACT_APP_API_URL.
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL || "";

export const SOCKET_ENDPOINT = API_ORIGIN;
