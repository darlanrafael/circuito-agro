import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ClientLayout } from './components/ClientLayout';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Circuito Nacional Jurídico Agro 2026',
  description: 'Dashboard de acompanhamento do Circuito Nacional Jurídico Agro 2026',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} min-h-full flex flex-col`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
