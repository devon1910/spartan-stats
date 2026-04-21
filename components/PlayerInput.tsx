'use client';

import { useState } from 'react';
import { Users, Pencil, CheckCircle, RefreshCw } from 'lucide-react';

interface PlayerInputProps {
  initialPlayers?: string[];
  onConfirm: (players: string[]) => void;
}

// Invisible Unicode chars WhatsApp injects: soft-hyphen, zero-width spaces, word joiners, BOM
const INVISIBLE_CHARS = /[­​‌‍⁠⁡⁢⁣⁤﻿]/g;

export default function PlayerInput({ initialPlayers = [], onConfirm }: PlayerInputProps) {
  const preloaded = initialPlayers.length > 0;
  const [text, setText] = useState('');
  // Start confirmed if we have preloaded players from an existing session
  const [confirmed, setConfirmed] = useState(preloaded);
  // Track which list is "active" — preloaded or manually parsed
  const [activePlayers, setActivePlayers] = useState<string[]>(initialPlayers);

  function parsePlayers(input: string): string[] {
    const cleaned = input.replace(INVISIBLE_CHARS, '');
    const matches = [...cleaned.matchAll(/^\d+\.\s*(.+)$/gm)];
    return matches.map((m) => m[1].trim()).filter(Boolean);
  }

  const parsed = parsePlayers(text);

  function handleConfirm() {
    if (parsed.length > 0) {
      setActivePlayers(parsed);
      setConfirmed(true);
      onConfirm(parsed);
    }
  }

  function handleEdit() {
    setConfirmed(false);
    setText('');
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-rose-400 shrink-0" />
          <h2 className="text-white font-semibold text-sm">Players</h2>
        </div>
        {preloaded && confirmed && (
          <span className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            Loaded from session
          </span>
        )}
      </div>

      {!confirmed ? (
        <>
          <textarea
            className="w-full bg-zinc-800 text-white rounded-xl p-3 text-sm placeholder-zinc-600 border border-zinc-700 focus:border-rose-500 focus:outline-none resize-none transition"
            rows={5}
            placeholder={"Paste your numbered list e.g.\n1. Devon\n2. Sean\n3. Tunde"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
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
            {activePlayers.map((name) => (
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
            <RefreshCw size={12} />
            Change player list
          </button>
        </div>
      )}
    </div>
  );
}
