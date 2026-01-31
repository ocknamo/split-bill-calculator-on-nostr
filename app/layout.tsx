import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type React from 'react'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ワリカンさん',
  description: 'グループでの支払いを簡単に精算。Nostr連携でLightning送金も可能',
  generator: 'v0.app',
  openGraph: {
    title: 'ワリカンさん',
    description: 'グループでの支払いを簡単に精算。Nostr連携でLightning送金も可能',
    images: [
      'https://image.nostr.build/030a16e61f69ac5035f7c013c0146393ae6ab425c7248c04e3f1c772d7f227f8.webp',
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ワリカンさん',
    description: 'グループでの支払いを簡単に精算。Nostr連携でLightning送金も可能',
    images: [
      'https://image.nostr.build/030a16e61f69ac5035f7c013c0146393ae6ab425c7248c04e3f1c772d7f227f8.webp',
    ],
  },
  icons: {
    icon: '/favicon.jpg',
    apple: '/favicon.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
