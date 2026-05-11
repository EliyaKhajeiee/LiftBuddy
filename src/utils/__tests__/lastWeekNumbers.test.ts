import {
  getLastEntry,
  getCompletedSets,
  getBestSet,
  getTopWeight,
  formatLastWeekSummary,
  getTotalVolume,
  didImprove,
  type ExerciseRecord,
} from '../lastWeekNumbers';

const makeRecord = (
  weightReps: [number, number][],
  date = Date.now(),
  allCompleted = true,
): ExerciseRecord => ({
  date,
  sets: weightReps.map(([weight, reps]) => ({ weight, reps, completed: allCompleted })),
});

// ─── getLastEntry ──────────────────────────────────────────────────────────────

describe('getLastEntry', () => {
  it('returns null for empty history', () => {
    expect(getLastEntry([])).toBeNull();
  });

  it('returns the most recent entry', () => {
    const older = makeRecord([[80, 8]], Date.now() - 7 * 86400000);
    const newer = makeRecord([[85, 7]], Date.now());
    expect(getLastEntry([older, newer])).toBe(newer);
    expect(getLastEntry([newer, older])).toBe(newer);
  });

  it('returns a single entry unchanged', () => {
    const entry = makeRecord([[100, 5]]);
    expect(getLastEntry([entry])).toBe(entry);
  });

  it('handles identical timestamps by returning one of them', () => {
    const ts = Date.now();
    const a = makeRecord([[80, 8]], ts);
    const b = makeRecord([[90, 6]], ts);
    expect([a, b]).toContain(getLastEntry([a, b]));
  });
});

// ─── getCompletedSets ─────────────────────────────────────────────────────────

describe('getCompletedSets', () => {
  it('returns only completed sets', () => {
    const sets = [
      { weight: 80, reps: 8, completed: true },
      { weight: 80, reps: 5, completed: false },
      { weight: 80, reps: 8, completed: true },
    ];
    const result = getCompletedSets(sets);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.completed)).toBe(true);
  });

  it('returns empty array when no sets are completed', () => {
    expect(getCompletedSets([{ weight: 80, reps: 8, completed: false }])).toHaveLength(0);
  });

  it('returns all sets when all are completed', () => {
    const sets = [
      { weight: 80, reps: 8, completed: true },
      { weight: 85, reps: 6, completed: true },
    ];
    expect(getCompletedSets(sets)).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(getCompletedSets([])).toHaveLength(0);
  });
});

// ─── getBestSet ───────────────────────────────────────────────────────────────

describe('getBestSet', () => {
  it('returns null for empty input', () => {
    expect(getBestSet([])).toBeNull();
  });

  it('returns null when no sets are completed', () => {
    expect(getBestSet([{ weight: 100, reps: 5, completed: false }])).toBeNull();
  });

  it('returns the set with highest volume (weight × reps)', () => {
    const sets = [
      { weight: 100, reps: 3, completed: true }, // 300
      { weight: 80,  reps: 8, completed: true }, // 640 ← best
      { weight: 90,  reps: 5, completed: true }, // 450
    ];
    expect(getBestSet(sets)).toEqual({ weight: 80, reps: 8, completed: true });
  });

  it('ignores incomplete sets even if they would win', () => {
    const sets = [
      { weight: 200, reps: 10, completed: false },
      { weight: 80,  reps: 8,  completed: true  },
    ];
    expect(getBestSet(sets)?.weight).toBe(80);
  });

  it('returns the only completed set when there is one', () => {
    const sets = [
      { weight: 60, reps: 10, completed: false },
      { weight: 75, reps: 8,  completed: true  },
    ];
    expect(getBestSet(sets)?.weight).toBe(75);
  });
});

// ─── getTopWeight ─────────────────────────────────────────────────────────────

describe('getTopWeight', () => {
  it('returns null for empty input', () => {
    expect(getTopWeight([])).toBeNull();
  });

  it('returns null when no sets are completed', () => {
    expect(getTopWeight([{ weight: 100, reps: 5, completed: false }])).toBeNull();
  });

  it('returns the highest weight among completed sets', () => {
    const sets = [
      { weight: 80,  reps: 8, completed: true  },
      { weight: 90,  reps: 6, completed: true  },
      { weight: 100, reps: 4, completed: false },
    ];
    expect(getTopWeight(sets)).toBe(90);
  });

  it('handles all same weights', () => {
    const sets = [
      { weight: 80, reps: 8, completed: true },
      { weight: 80, reps: 7, completed: true },
    ];
    expect(getTopWeight(sets)).toBe(80);
  });
});

// ─── formatLastWeekSummary ────────────────────────────────────────────────────

describe('formatLastWeekSummary', () => {
  it('returns empty string for null', () => {
    expect(formatLastWeekSummary(null)).toBe('');
  });

  it('returns empty string when no completed sets', () => {
    const entry: ExerciseRecord = {
      date: Date.now(),
      sets: [{ weight: 80, reps: 8, completed: false }],
    };
    expect(formatLastWeekSummary(entry)).toBe('');
  });

  it('formats as "NxAvgReps @ TopWeightkg"', () => {
    const entry = makeRecord([[80, 8], [80, 8], [80, 7]]);
    expect(formatLastWeekSummary(entry)).toBe('3×8 @ 80kg');
  });

  it('shows top weight when weights vary across sets', () => {
    const entry = makeRecord([[80, 8], [85, 7], [80, 8]]);
    expect(formatLastWeekSummary(entry)).toBe('3×8 @ 85kg');
  });

  it('handles a single completed set', () => {
    const entry = makeRecord([[100, 5]]);
    expect(formatLastWeekSummary(entry)).toBe('1×5 @ 100kg');
  });

  it('rounds average reps correctly', () => {
    const entry = makeRecord([[50, 10], [50, 11]]);
    expect(formatLastWeekSummary(entry)).toBe('2×11 @ 50kg');
  });
});

// ─── getTotalVolume ───────────────────────────────────────────────────────────

describe('getTotalVolume', () => {
  it('returns 0 for empty input', () => {
    expect(getTotalVolume([])).toBe(0);
  });

  it('sums weight × reps for completed sets only', () => {
    const sets = [
      { weight: 80, reps: 8, completed: true  }, // 640
      { weight: 80, reps: 8, completed: false }, // skipped
      { weight: 80, reps: 8, completed: true  }, // 640
    ];
    expect(getTotalVolume(sets)).toBe(1280);
  });

  it('returns 0 if no sets are completed', () => {
    expect(getTotalVolume([{ weight: 100, reps: 10, completed: false }])).toBe(0);
  });

  it('handles fractional weights correctly', () => {
    expect(getTotalVolume([{ weight: 82.5, reps: 8, completed: true }])).toBeCloseTo(660);
  });
});

// ─── didImprove ───────────────────────────────────────────────────────────────

describe('didImprove', () => {
  it('returns false when both entries are null', () => {
    expect(didImprove(null, null)).toBe(false);
  });

  it('returns false when current is null', () => {
    expect(didImprove(null, makeRecord([[80, 8]]))).toBe(false);
  });

  it('returns false when previous is null', () => {
    expect(didImprove(makeRecord([[80, 8]]), null)).toBe(false);
  });

  it('returns true when current total volume exceeds previous', () => {
    const previous = makeRecord([[80, 8], [80, 8]]);    // 1280
    const current  = makeRecord([[82.5, 8], [82.5, 8]]); // 1320
    expect(didImprove(current, previous)).toBe(true);
  });

  it('returns false when current volume is lower than previous', () => {
    const previous = makeRecord([[80, 8], [80, 8]]); // 1280
    const current  = makeRecord([[80, 6], [80, 6]]); // 960
    expect(didImprove(current, previous)).toBe(false);
  });

  it('returns false when volumes are equal', () => {
    const previous = makeRecord([[80, 8]]);
    const current  = makeRecord([[80, 8]]);
    expect(didImprove(current, previous)).toBe(false);
  });
});
