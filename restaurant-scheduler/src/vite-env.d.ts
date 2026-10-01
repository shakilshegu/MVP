/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` (default) uses demo data in the browser; `api` uses the real backend. */
  readonly VITE_DATA_SOURCE?: 'mock' | 'api'
  readonly VITE_API_URL?: string
}
