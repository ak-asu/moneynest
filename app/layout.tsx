import '../styles/globals.css'
import { Metadata, Viewport } from 'next'
import clsx from 'clsx'
import { Providers } from './providers'
import { siteConfig } from '@/config/site'
import { fontSans } from '@/config/fonts'

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e6eefc' },
    { media: '(prefers-color-scheme: dark)', color: '#1c2437' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          'min-h-screen bg-clay-bg text-foreground font-sans antialiased',
          fontSans.variable
        )}
      >
        <Providers themeProps={{ attribute: 'class', defaultTheme: 'light' }}>{children}</Providers>
      </body>
    </html>
  )
}
