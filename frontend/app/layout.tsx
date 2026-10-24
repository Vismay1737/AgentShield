import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { WSProvider } from '@/lib/ws-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgentShield — AI Immune System',
  description: 'Security gateway that monitors, evaluates, and controls AI agent actions before execution.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen`}>
        <WSProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </WSProvider>
      </body>
    </html>
  );
}
