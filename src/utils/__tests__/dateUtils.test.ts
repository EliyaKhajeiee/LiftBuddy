import {
  toDateKey,
  daysInMonth,
  getISOWeek,
  getMondayOfWeek,
  fmtDuration,
  fmtVolume,
} from '../dateUtils';

// ─── toDateKey ─────────────────────────────────────────────────────────────────

describe('toDateKey', () => {
  it('pads single-digit month and day', () => {
    expect(toDateKey(new Date(2025, 0, 5))).toBe('2025-00-05');   // Jan = 0
    expect(toDateKey(new Date(2025, 8, 3))).toBe('2025-08-03');   // Sep = 8
  });

  it('handles double-digit month and day without double-padding', () => {
    expect(toDateKey(new Date(2025, 10, 15))).toBe('2025-10-15'); // Nov = 10
    expect(toDateKey(new Date(2025, 11, 31))).toBe('2025-11-31'); // Dec = 11
  });

  it('produces consistent keys for the same date', () => {
    const d = new Date(2025, 5, 20);
    expect(toDateKey(d)).toBe(toDateKey(d));
  });

  it('keys from different months sort correctly as strings', () => {
    const jan = toDateKey(new Date(2025, 0, 15));  // "2025-00-15"
    const nov = toDateKey(new Date(2025, 10, 5));  // "2025-10-05"
    expect(jan < nov).toBe(true);
  });

  it('keys across year boundaries sort correctly', () => {
    const dec2024 = toDateKey(new Date(2024, 11, 31));
    const jan2025 = toDateKey(new Date(2025, 0, 1));
    expect(dec2024 < jan2025).toBe(true);
  });
});

// ─── daysInMonth ───────────────────────────────────────────────────────────────

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth(2025, 0)).toBe(31);
  });

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(2025, 1)).toBe(28);
  });

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  it('returns 30 for April', () => {
    expect(daysInMonth(2025, 3)).toBe(30);
  });

  it('returns 31 for December', () => {
    expect(daysInMonth(2025, 11)).toBe(31);
  });
});

// ─── getISOWeek ────────────────────────────────────────────────────────────────

describe('getISOWeek', () => {
  it('returns week 1 for Jan 1 2025 (Wednesday)', () => {
    const { week, year } = getISOWeek(new Date(2025, 0, 1));
    expect(week).toBe(1);
    expect(year).toBe(2025);
  });

  it('returns week 52 for Dec 28 2024 (last week of 2024)', () => {
    const { week, year } = getISOWeek(new Date(2024, 11, 28));
    expect(week).toBe(52);
    expect(year).toBe(2024);
  });

  it('returns week 1 for Dec 30 2024 (ISO week belonging to 2025)', () => {
    // Dec 30 2024 is Monday of ISO week 1 of 2025
    const { week, year } = getISOWeek(new Date(2024, 11, 30));
    expect(week).toBe(1);
    expect(year).toBe(2025);
  });

  it('returns increasing week numbers through a year', () => {
    const weeks = [1, 4, 15, 26, 40, 50].map(
      (w) => getISOWeek(new Date(2025, 0, 1 + (w - 1) * 7)).week,
    );
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i]).toBeGreaterThan(weeks[i - 1]);
    }
  });

  it('returns week 53 for Dec 28 2020 (2020 has 53 ISO weeks)', () => {
    const { week, year } = getISOWeek(new Date(2020, 11, 28));
    expect(week).toBe(53);
    expect(year).toBe(2020);
  });
});

// ─── getMondayOfWeek ───────────────────────────────────────────────────────────

describe('getMondayOfWeek', () => {
  it('returns the same Monday for a Monday input', () => {
    const monday = new Date(2025, 0, 6); // Jan 6 2025 is Monday
    const result = getMondayOfWeek(monday);
    expect(result.getDate()).toBe(6);
    expect(result.getDay()).toBe(1);
  });

  it('returns the previous Monday for a Wednesday', () => {
    const wednesday = new Date(2025, 0, 8); // Jan 8 2025 is Wednesday
    const result = getMondayOfWeek(wednesday);
    expect(result.getDate()).toBe(6);
    expect(result.getDay()).toBe(1);
  });

  it('returns the previous Monday for a Sunday', () => {
    const sunday = new Date(2025, 0, 12); // Jan 12 2025 is Sunday
    const result = getMondayOfWeek(sunday);
    expect(result.getDate()).toBe(6); // same week Monday
    expect(result.getDay()).toBe(1);
  });

  it('sets time to midnight (00:00:00)', () => {
    const d = new Date(2025, 0, 9, 14, 30, 45); // Thursday afternoon
    const result = getMondayOfWeek(d);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('handles week crossing month boundary', () => {
    // Jan 1 2025 is Wednesday; Monday of that week is Dec 30 2024
    const result = getMondayOfWeek(new Date(2025, 0, 1));
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(11); // December
    expect(result.getDate()).toBe(30);
  });
});

// ─── fmtDuration ───────────────────────────────────────────────────────────────

describe('fmtDuration', () => {
  it('shows minutes only when under an hour', () => {
    expect(fmtDuration(0)).toBe('0m');
    expect(fmtDuration(1)).toBe('1m');
    expect(fmtDuration(45)).toBe('45m');
    expect(fmtDuration(59)).toBe('59m');
  });

  it('shows hours and minutes for 60+', () => {
    expect(fmtDuration(60)).toBe('1h 0m');
    expect(fmtDuration(90)).toBe('1h 30m');
    expect(fmtDuration(125)).toBe('2h 5m');
  });
});

// ─── fmtVolume ─────────────────────────────────────────────────────────────────

describe('fmtVolume', () => {
  it('shows rounded lbs for values under 1000', () => {
    expect(fmtVolume(0)).toBe('0 lbs');
    expect(fmtVolume(999)).toBe('999 lbs');
    expect(fmtVolume(500.6)).toBe('501 lbs');
  });

  it('shows k notation for 1000+', () => {
    expect(fmtVolume(1000)).toBe('1.0k lbs');
    expect(fmtVolume(1500)).toBe('1.5k lbs');
    expect(fmtVolume(12345)).toBe('12.3k lbs');
  });
});
