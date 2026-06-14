import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MantleArb - AI-Powered DEX Arbitrage',
  description: 'AI-Powered DEX Arbitrage Agent on Mantle Network',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
