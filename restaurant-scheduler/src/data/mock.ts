import { createSeed } from '../lib/seed'
import type { Data } from '../lib/types'
import type { Backend } from './backend'

const KEY = 'rota-state-v8'
const VERSION = 8

/** Demo data kept in this browser. Used for client demos; needs no server. */
export const mockBackend: Backend = {
  kind: 'mock',
  async load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const d = JSON.parse(raw) as Data
        if (d.version === VERSION) return d
      }
    } catch {
      /* unreadable or blocked storage: start from fresh demo data */
    }
    return createSeed()
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* storage may be full or blocked; the app keeps working in memory */
    }
  },
}
