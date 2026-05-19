import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://perseo.midmarketing.com.ar'),
  title: {
    default: 'Perseo — Convertí tus campañas de WhatsApp en un sistema medible',
    template: '%s — Perseo',
  },
  description:
    'PERSEO organiza, clasifica y analiza automáticamente los leads que llegan desde tus campañas de WhatsApp. Scoring con IA, Google Sheets, métricas en tiempo real.',
  keywords: [
    'leads whatsapp', 'gestión leads', 'crm whatsapp', 'marketing digital',
    'scoring leads', 'google sheets leads', 'meta ads whatsapp', 'perseo',
    'mid marketing', 'captura leads automatica',
  ],
  authors: [{ name: 'MID Marketing', url: 'https://perseo.midmarketing.com.ar' }],
  creator: 'MID Marketing',
  publisher: 'MID Marketing',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://perseo.app',
    siteName: 'Perseo',
    title: 'Perseo — Convertí tus campañas de WhatsApp en un sistema medible',
    description: 'Organizá, clasificá y analizá automáticamente los leads de WhatsApp.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Perseo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perseo — Convertí tus campañas de WhatsApp en un sistema medible',
    description: 'Organizá, clasificá y analizá automáticamente los leads de WhatsApp.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      {/* Prevent FOUC: apply stored theme before React hydrates */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('perseo_theme');
                if (t === 'light') document.documentElement.classList.add('light');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body
        className="antialiased"
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text-1)' }}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
