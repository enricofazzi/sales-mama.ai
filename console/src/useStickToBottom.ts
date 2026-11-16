// Follow new chat content only while the reader is at the bottom (Claude/ChatGPT behaviour).
// Scrolling up during a run unpins: streaming text and late-loading charts no longer yank the page,
// and a "Jump to latest" pill appears instead. Sending a prompt re-pins.
import { useCallback, useEffect, useRef, useState } from 'react';

const NEAR = 120; // px from the bottom that still counts as "at the bottom"

const gap = () => document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);

export function useStickToBottom(watch: React.RefObject<HTMLElement>, turnCount: number) {
  const pinned = useRef(true);
  const jumping = useRef(false);
  const [showJump, setShowJump] = useState(false);

  // Instant, so it never fights the reader's own wheel or trackpad momentum.
  const toBottom = useCallback(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
  }, []);

  // Unpin only on the reader's own upward movement. Content growing under us (or a scroll event that
  // lands after charts grew the page) must not count as "the reader left the bottom".
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (!jumping.current && y < lastY - 2) pinned.current = false;
      if (gap() < NEAR) { pinned.current = true; setShowJump(false); }
      lastY = y;
    };
    // Wheeling inside the rail or the source drawer scrolls those panels, not the conversation.
    const onWheel = (e: WheelEvent) => { if (e.deltaY < 0 && !(e.target as HTMLElement)?.closest?.('.rail, .drawer')) pinned.current = false; };
    const onKey = (e: KeyboardEvent) => { if (['PageUp', 'ArrowUp', 'Home'].includes(e.key) && !(e.target as HTMLElement)?.closest('textarea, input')) pinned.current = false; };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Content grows while streaming, and surfaces grow again when their data and charts load.
  useEffect(() => {
    const el = watch.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (pinned.current) toBottom();
      else if (gap() > NEAR) setShowJump(true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [watch, toBottom]);

  // A new turn (the user just asked something): pin and follow.
  useEffect(() => {
    if (!turnCount) return;
    pinned.current = true;
    setShowJump(false);
    toBottom();
  }, [turnCount, toBottom]);

  const jump = useCallback(() => {
    pinned.current = true;
    jumping.current = true;
    setShowJump(false);
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    window.setTimeout(() => { jumping.current = false; pinned.current = gap() < NEAR; }, 700);
  }, []);

  return { showJump, jump };
}
