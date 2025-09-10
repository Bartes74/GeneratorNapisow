// Central API base configuration for both dev and production
// - In dev (Vite on :5173), default to http://localhost:8000
// - In production (served behind Nginx), default to same-origin with relative paths
const inferredDevBase = (typeof window !== 'undefined' && window.location.port === '5173')
  ? 'http://localhost:8000'
  : ''

const runtimeBase = (typeof window !== 'undefined' && window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || ''
const rawBase = runtimeBase || (import.meta.env && import.meta.env.VITE_API_URL) || inferredDevBase || ''

export const API_BASE = rawBase.replace(/\/$/, '')

export const apiPath = (path) => {
  if (!path.startsWith('/')) return `${API_BASE}/${path}`
  return `${API_BASE}${path}`
}


