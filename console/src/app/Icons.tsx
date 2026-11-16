// Inline SVG icons (no emoji, no icon font). 1.8px strokes on a 24 grid, currentColor.
import type { ReactNode } from 'react';

const I = ({ children, size = 22, label }: { children: ReactNode; size?: number; label?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>{children}</svg>
);

export const IconToday = (p: { size?: number }) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I>;
export const IconChat = (p: { size?: number }) => <I {...p}><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.1A8 8 0 1 1 20 12Z" /><path d="M8.5 11h7M8.5 14h4.5" /></I>;
export const IconBook = (p: { size?: number }) => <I {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></I>;
export const IconSun = (p: { size?: number }) => <I {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></I>;
export const IconMoon = (p: { size?: number }) => <I {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></I>;
export const IconAuto = (p: { size?: number }) => <I {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" /></I>;
export const IconPlus = (p: { size?: number }) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IconArrow = (p: { size?: number }) => <I {...p}><path d="M5 12h13M13 6l6 6-6 6" /></I>;
export const IconDown = (p: { size?: number }) => <I {...p}><path d="M12 4v15M6 13l6 6 6-6" /></I>;
export const IconBolt = (p: { size?: number }) => <I {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></I>;
export const IconFlag = (p: { size?: number }) => <I {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></I>;
export const IconUsers = (p: { size?: number }) => <I {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></I>;
export const IconFire = (p: { size?: number }) => <I {...p}><path d="M12 22c4 0 7-2.7 7-6.6 0-3.3-2-5.4-3.6-7.2-.4 2-1.4 3.2-2.6 3.8.4-3.4-1.2-6.6-4.3-8.9-.2 3.3-1.6 5.3-3 7.2C4.3 12.3 5 14 5 15.4 5 19.3 8 22 12 22Z" /></I>;
export const IconAlert = (p: { size?: number }) => <I {...p}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4.5M12 17.5v.01" /></I>;
export const IconMail = (p: { size?: number }) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></I>;
export const IconCheck = (p: { size?: number }) => <I {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></I>;
export const IconInfo = (p: { size?: number }) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></I>;
export const IconSpark = (p: { size?: number }) => <I {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" /></I>;
