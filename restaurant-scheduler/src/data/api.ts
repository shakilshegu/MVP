import type { Backend } from './backend'

/**
 * The real backend. Not connected yet: with VITE_DATA_SOURCE=api the app shows a clear
 * "can't connect" screen instead of demo data, so the two are never confused.
 */
export const apiBackend: Backend = {
  kind: 'api',
  async load() {
    throw new Error('The API backend is not connected yet. Run the app in mock mode for the demo.')
  },
  save() {
    /* the server stores each change itself */
  },
}
