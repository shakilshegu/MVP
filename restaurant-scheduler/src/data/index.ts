import { apiBackend } from './api'
import type { Backend } from './backend'
import { mockBackend } from './mock'

export type { Backend, DataSourceKind } from './backend'

/** Chosen at build time: `VITE_DATA_SOURCE=api` for the real backend, anything else for demo data. */
export const backend: Backend = import.meta.env.VITE_DATA_SOURCE === 'api' ? apiBackend : mockBackend
