'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Trophy } from 'lucide-react';

export default function Tabs() {
  const pathname = usePathname();

  const tabs = [
    { href: '/log', label: 'Log Session', Icon: ClipboardList },
    { href: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-900">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        <div className="flex">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname === href || (pathname === '/' && href === '/log');
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 py-3 sm:py-4 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold transition border-b-2 ${
                  active
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
