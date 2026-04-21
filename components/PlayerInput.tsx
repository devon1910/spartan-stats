'use client';

import { useState } from 'react';
import { Users, Pencil, CheckCircle } from 'lucide-react';

interface PlayerInputProps {
  onConfirm: (players: string[]) => void;
}

export default function PlayerInput({ onConfirm }: PlayerInputProps) {
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  function parsePlayers(input: string): string[] {
    const matches = [...input.matchAll(/\d+\.\s*([A-Za-z]+)/g)];
    return matches.map((m) => m[1]);
  }

  const parsed = parsePlayers(text);

  function handleConfirm() {
    if (parsed.length > 0) {
      setConfirmed(true);
      onConfirm(parsed);
    }
  }

  function handleEdit() {
    setConfirmed(false);
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users size={15} className="text-rose-400 shrink-0" />
        <h2 className="text-white font-semibold text-sm">Players</h2>
      </div>

      {!confirmed ? (
        <>
          <textarea
            className="w-full bg-zinc-800 text-white rounded-xl p-3 text-sm placeholder-zinc-600 border border-zinc-700 focus:border-rose-500 focus:outline-none resize-none transition"
            rows={4}
            placeholder="Paste your list e.g. 1. Devon 2. Sean 3. Tunde..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {parsed.length > 0 && (
            <div className="mt-3">
              <p className="text-zinc-500 text-xs mb-2">{parsed.length} players detected</p>
              <div className="flex flex-wrap gap-1.5">
                {parsed.map((name) => (
                  <span
                    key={name}
                    className="bg-rose-500/10 text-rose-300 text-xs px-3 py-1 rounded-full border border-rose-500/30"
                  >
                    {name}
                  </span>
                ))}
              </div>
              <button
                onClick={handleConfirm}
                className="mt-4 w-full bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <CheckCircle size={15} />
                Confirm Players
              </button>
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {parsed.map((name) => (
              <span
                key={name}
                className="bg-rose-500/10 text-rose-300 text-xs px-3 py-1 rounded-full border border-rose-500/30"
              >
                {name}
              </span>
            ))}
          </div>
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 text-zinc-500 text-xs hover:text-zinc-300 transition"
          >
            <Pencil size={12} />
            Edit players
          </button>
        </div>
      )}
    </div>
  );
}
