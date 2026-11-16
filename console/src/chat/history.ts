// Local chat history (spec §5.5): conversations live in this browser only — the console never writes
// the repo (ADR-0006). Capped so localStorage stays well under its quota.
import { useEffect } from 'react';
import type { ChatTurn } from '../useBridge';

export interface SavedChat { id: string; title: string; sessionId?: string; updated: string; turns: ChatTurn[] }
const KEY = 'mama.chats';
const MAX_CHATS = 20;
const MAX_BYTES = 3_000_000;

export function loadChats(): SavedChat[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

function write(chats: SavedChat[]) {
  let list = chats.slice(0, MAX_CHATS);
  for (;;) {
    const json = JSON.stringify(list);
    if (json.length <= MAX_BYTES || list.length <= 1) {
      try { localStorage.setItem(KEY, json); } catch { /* quota or private mode: history is a convenience */ }
      break;
    }
    list = list.slice(0, -1);
  }
  window.dispatchEvent(new Event('mama:history'));
}

export function removeChat(id: string) { write(loadChats().filter(c => c.id !== id)); }

export function titleFor(turns: ChatTurn[]): string {
  const p = turns[0]?.prompt ?? 'New chat';
  return p.length > 70 ? `${p.slice(0, 67)}…` : p;
}

/** Save the current conversation whenever no turn is running. Replays and saved results are not chats. */
export function useSaveChat(chatId: string, turns: ChatTurn[], sessionId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !turns.length || turns.some(t => t.running)) return;
    const rest = loadChats().filter(c => c.id !== chatId);
    write([{ id: chatId, title: titleFor(turns), sessionId, updated: new Date().toISOString(), turns }, ...rest]);
  }, [chatId, turns, sessionId, enabled]);
}
