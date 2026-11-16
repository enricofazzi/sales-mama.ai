// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addDays, countdown, dayDiff, minutesOf, pack, place, valid, weekStart, windowOn, ymd, type CalItem } from '../src/calendar/time';
import { nextAppointment } from '../src/calendar/NextUp';

const appt = (id: string, start: string, end: string, extra: Partial<CalItem> = {}): CalItem =>
  ({ id, kind: 'meeting', status: 'confirmed', title: id, start, end, all_day: false, live: true, ...extra });

describe('calendar time', () => {
  it('places items in the market zone, whatever the offset they were written with', () => {
    const p = place(appt('a', '2026-11-18T14:00:00+08:00', '2026-11-18T14:45:00+08:00'), 'Asia/Singapore');
    expect([p.day, p.startMin, p.endMin, p.allDay]).toEqual(['2026-11-18', 840, 885, false]);
    // An IN meeting at 11:30 IST is 14:00 in Singapore.
    const q = place(appt('b', '2026-11-18T11:30:00+05:30', '2026-11-18T12:00:00+05:30'), 'Asia/Singapore');
    expect([q.day, q.startMin]).toEqual(['2026-11-18', 840]);
    const all = place({ ...appt('c', '2026-12-02', '2026-12-03'), all_day: true, kind: 'event' }, 'Asia/Singapore');
    expect([all.day, all.endDay, all.allDay]).toEqual(['2026-12-02', '2026-12-03', true]);
  });

  it('packs overlapping events side by side and marks the clash', () => {
    const tz = 'Asia/Singapore';
    const ps = [appt('a', '2026-11-18T14:00:00+08:00', '2026-11-18T15:00:00+08:00'), appt('b', '2026-11-18T14:30:00+08:00', '2026-11-18T15:30:00+08:00'),
      appt('c', '2026-11-18T16:00:00+08:00', '2026-11-18T16:30:00+08:00')].map(i => place(i, tz));
    const out = Object.fromEntries(pack(ps).map(x => [x.p.item.id, [x.col, x.cols, x.clash]]));
    expect(out).toEqual({ a: [0, 2, true], b: [1, 2, true], c: [0, 1, false] });
  });

  it('send windows follow the market days; weeks start on Monday', () => {
    const sw = { days: ['mon', 'tue', 'wed', 'thu'], hours: '09:00-11:30' };
    expect(windowOn('2026-11-16', sw)).toEqual([540, 690]);   // Monday
    expect(windowOn('2026-11-20', sw)).toBeNull();            // Friday
    expect(weekStart('2026-11-22')).toBe('2026-11-16');       // Sunday → Monday
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(dayDiff('2026-11-16', '2026-12-02')).toBe(16);
  });

  it('day and minute in a zone', () => {
    const d = new Date('2026-11-16T17:30:00Z');                 // 01:30 next day in SG
    expect(ymd(d, 'Asia/Singapore')).toBe('2026-11-17');
    expect(minutesOf(d, 'Asia/Singapore')).toBe(90);
    expect(minutesOf(d, 'Asia/Kolkata')).toBe(23 * 60);
  });

  it('countdowns read naturally', () => {
    expect(countdown(30_000)).toBe('now');
    expect(countdown(25 * 60_000)).toBe('in 25 min');
    expect(countdown((3 * 60 + 18) * 60_000)).toBe('in 3 h 18 m');
    expect(countdown(3 * 86400000)).toBe('in 3 days');
  });

  it('next up is the next live appointment that has not ended', () => {
    const cal: any = { tz: 'Asia/Singapore', items: [
      appt('past', '2026-11-16T09:00:00+08:00', '2026-11-16T09:30:00+08:00'),
      appt('cancelled', '2026-11-16T11:00:00+08:00', '2026-11-16T11:30:00+08:00', { live: false, status: 'cancelled' }),
      appt('running', '2026-11-16T10:00:00+08:00', '2026-11-16T10:45:00+08:00'),
      appt('later', '2026-11-17T14:00:00+08:00', '2026-11-17T14:45:00+08:00')] };
    expect(nextAppointment(cal, new Date('2026-11-16T10:20:00+08:00'))?.id).toBe('running');
    expect(nextAppointment(cal, new Date('2026-11-16T10:50:00+08:00'))?.id).toBe('later');
  });

  it('a malformed row is dropped, never crashes the calendar', () => {
    expect(valid(appt('ok', '2026-11-19T09:00:00+08:00', '2026-11-19T09:45:00+08:00'))).toBe(true);
    expect(valid(appt('bad', '2026-11-19T9:00:00+08:00', '2026-11-19T9:45:00+08:00'))).toBe(false);
    expect(valid({ ...appt('day', '2026-12-02', '2026-12-03'), all_day: true })).toBe(true);
    expect(() => place(appt('bad', 'nope', 'nope'), 'Asia/Singapore')).not.toThrow();
  });
});
