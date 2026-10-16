import type { Metadata } from 'next'
import { copy, site } from '@/content'
import { sans, serif } from '../../fonts'
import '../../globals.css'

export const metadata: Metadata = {
  title: copy.de.meta.title,
  description: copy.de.meta.description,
  icons: { icon: '/favicon.svg' },
  alternates: { canonical: '/de/', languages: { en: '/', de: '/de/' } },
  metadataBase: new URL(site.siteUrl),
  openGraph: {
    type: 'website',
    siteName: 'Rota',
    locale: 'de_DE',
    title: copy.de.meta.title,
    description: copy.de.meta.description,
    images: [{ url: '/og-de.png', width: 1200, height: 630, alt: copy.de.hero.title }],
  },
  twitter: { card: 'summary_large_image', title: copy.de.meta.title, description: copy.de.meta.description, images: ['/og-de.png'] },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  )
}
