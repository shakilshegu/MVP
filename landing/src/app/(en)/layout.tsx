import type { Metadata } from 'next'
import { copy } from '@/content'
import { sans, serif } from '../fonts'
import '../globals.css'

export const metadata: Metadata = {
  title: copy.en.meta.title,
  description: copy.en.meta.description,
  icons: { icon: '/favicon.svg' },
  alternates: { languages: { en: '/', de: '/de' } },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  )
}
