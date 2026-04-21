import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Tabs from '@/components/Tabs';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SpartanStats',
  description: 'Tuesday football stats tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-zinc-950 min-h-screen`}>
        <header className="bg-zinc-950 border-b border-zinc-900 px-4 py-3 sm:py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-rose-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-rose-900/50">
              <span className="text-base sm:text-lg">⚽</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl leading-none">SpartanStats</h1>
              <p className="text-rose-400 text-xs">Tuesday Football</p>
            </div>
          </div>
        </header>
        <Tabs />
        <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">{children}</main>
      </body>
    </html>
  );
}
