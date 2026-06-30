import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Teras Lmbur OS',
    template: '%s | Teras Lmbur OS',
  },
  description: 'Restaurant Management System — From single outlet to franchise platform',
  keywords: ['restaurant', 'management', 'pos', 'kitchen', 'inventory'],
  authors: [{ name: 'Teras Lmbur' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
