import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './lib/store'
import { I18nProvider } from './i18n'
import { backend } from './data'
import { BootScreen } from './components/Boot'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <StoreProvider backend={backend} fallback={(boot) => <BootScreen boot={boot} />}>
        <App />
      </StoreProvider>
    </I18nProvider>
  </StrictMode>,
)
