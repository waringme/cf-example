import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CTA Content Fragment — third-party consumer demo',
  description:
    'A Next.js app demonstrating how an AEM CTA content fragment can be consumed by a third-party web app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
