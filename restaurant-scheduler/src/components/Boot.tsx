import { AlertTriangle, RotateCw } from 'lucide-react'
import { useT } from '../i18n'
import { Button } from './ui'

type Boot = { status: 'loading' } | { status: 'error'; message: string; retry: () => void }

/** Full-screen state while the app's data loads, or when it can't be reached. */
export function BootScreen({ boot }: { boot: Boot }) {
  const { t } = useT()
  return (
    <div className="flex min-h-full items-center justify-center bg-paper px-6">
      {boot.status === 'loading' ? (
        <div role="status" className="flex items-center gap-3 text-sm text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-forest/25 border-t-forest" />
          {t('boot.loading')}
        </div>
      ) : (
        <div role="alert" className="panel max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-bark" />
          <h1 className="mt-3 text-lg font-semibold">{t('boot.errorTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{boot.message}</p>
          <Button variant="primary" className="mt-5" onClick={boot.retry}>
            <RotateCw className="h-4 w-4" /> {t('errors.tryAgain')}
          </Button>
        </div>
      )}
    </div>
  )
}
