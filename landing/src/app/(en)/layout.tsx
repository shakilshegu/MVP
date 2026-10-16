import type { Metadata } from 'next'
import { copy, site } from '@/content'
import { sans, serif } from '../fonts'
import '../globals.css'

export const metadata: Metadata = {
  title: copy.en.meta.title,
  description: copy.en.meta.description,
  icons: { icon: '/favicon.svg' },
  alternates: { canonical: '/', languages: { en: '/', de: '/de/' } },
  metadataBase: new URL(site.siteUrl),
  openGraph: {
    type: 'website',
    siteName: 'Rota',
    locale: 'en_GB',
    title: copy.en.meta.title,
    description: copy.en.meta.description,
    images: [{ url: '/og-en.png', width: 1200, height: 630, alt: copy.en.hero.title }],
  },
  twitter: { card: 'summary_large_image', title: copy.en.meta.title, description: copy.en.meta.description, images: ['/og-en.png'] },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  )
}
