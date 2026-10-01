import type { Data } from '../lib/types'

export type DataSourceKind = 'mock' | 'api'

/**
 * Where the app's data comes from. Screens never talk to this directly — they use the
 * store — so switching between demo data and the real backend doesn't touch any screen.
 */
export interface Backend {
  kind: DataSourceKind
  /** Everything the current user is allowed to see. */
  load(): Promise<Data>
  /** Called after every change with the new data. */
  save(data: Data): void
}
