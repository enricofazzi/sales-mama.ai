// Follow new chat content only while the reader is at the bottom (Claude/ChatGPT behaviour).
// Works on the thread's own scroll container (spec §4: the document never scrolls).
// Scrolling up unpins: streaming text and late-loading charts no longer yank the view, and a
// "Jump to latest" pill appears instead. Sending a prompt re-pins.
import { useCallback, useEffect, useRef, useState } from 'react';

const NEAR = 120; // px from the bottom that still counts as "at the bottom"

export function useStickToBottom(scroller: React.RefObject<HTMLElement>, content: React.RefObject<HTMLElement>, turnCount: number) {
  const pinned = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const gap = useCallback(() => {
    const el = scroller.current;
    return el ? el.scrollHeight - (el.scrollTop + el.clientHeight) : 0;
  }, [scroller]);

  // Instant, so it never fights the reader's own wheel or trackpad momentum.
  const toBottom = useCallback(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [scroller]);

  // Unpin only on the reader's own input: wheel or touch moving up, scroll keys, or dragging the
  // scrollbar upwards. Scroll-position changes alone never unpin: the browser also moves scrollTop
  // when content shrinks or reflows (a skeleton swapped for a chart), and that is not the reader.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let dragging = false, lastTop = el.scrollTop, touchY = 0;
    const onScroll = () => {
      const top = el.scrollTop;
      if (dragging && top < lastTop - 2) pinned.current = false;
      if (gap() < NEAR) { pinned.current = true; setShowJump(false); }
      lastTop = top;
    };
    const onWheel = (e: WheelEvent) => { if (e.deltaY < 0) pinned.current = false; };
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => { if ((e.touches[0]?.clientY ?? 0) > touchY + 4) pinned.current = false; };
    const onKey = (e: KeyboardEvent) => {
      if (['PageUp', 'ArrowUp', 'Home'].includes(e.key) && !(e.target as HTMLElement)?.closest?.('textarea, input')) pinned.current = false;
    };
    // A pointer pressed on the scroller itself (not its content) is the scrollbar.
    const onDown = (e: PointerEvent) => { if (e.target === el) dragging = true; };
    const onUp = () => { dragging = false; };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('keydown', onKey);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [scroller, gap]);

  // Content grows while streaming, and surfaces grow again when their data and charts load.
  useEffect(() => {
    const el = content.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (pinned.current) toBottom();
      else if (gap() > NEAR) setShowJump(true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [content, toBottom, gap]);

  // A new turn (the user just asked something): pin and follow.
  useEffect(() => {
    if (!turnCount) return;
    pinned.current = true;
    setShowJump(false);
    toBottom();
  }, [turnCount, toBottom]);

  const jump = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    pinned.current = true;
    setShowJump(false);
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    window.setTimeout(() => { pinned.current = gap() < NEAR; }, 700);
  }, [scroller, gap]);

  return { showJump, jump };
}
