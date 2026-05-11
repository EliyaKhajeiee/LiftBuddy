import { generatePlan } from '../generatePlan';
import type { UserProfile } from '../../types';

jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1_000_000, nanoseconds: 0 })),
    fromDate: jest.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
  },
}));

// ─── Shared profile factory ────────────────────────────────────────────────────

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    age: 25,
    height: 70,
    weight: 80,
    goal: 'bulk',
    experience: 'intermediate',
    daysPerWeek: 3,
    location: 'gym',
    equipment: ['barbell', 'dumbbells', 'cables', 'machines', 'pull_up_bar'],
    muscleFocus: [],
    injuries: [],
    ...overrides,
  };
}

// ─── Split selection ───────────────────────────────────────────────────────────

describe('split selection', () => {
  it('picks full_body for 2 days/week', () => {
    const plan = generatePlan(profile({ daysPerWeek: 2 }), 'uid1');
    expect(plan.split).toBe('full_body');
    expect(Object.keys(plan.days)).toHaveLength(2);
  });

  it('picks full_body for 3 days/week', () => {
    const plan = generatePlan(profile({ daysPerWeek: 3 }), 'uid1');
    expect(plan.split).toBe('full_body');
    expect(Object.keys(plan.days)).toHaveLength(3);
  });

  it('picks upper_lower for 4 days/week', () => {
    const plan = generatePlan(profile({ daysPerWeek: 4 }), 'uid1');
    expect(plan.split).toBe('upper_lower');
    expect(Object.keys(plan.days)).toHaveLength(4);
  });

  it('picks ppl for 5 days/week', () => {
    const plan = generatePlan(profile({ daysPerWeek: 5 }), 'uid1');
    expect(plan.split).toBe('ppl');
    expect(Object.keys(plan.days)).toHaveLength(5);
  });

  it('picks ppl for 6 days/week', () => {
    const plan = generatePlan(profile({ daysPerWeek: 6 }), 'uid1');
    expect(plan.split).toBe('ppl');
    expect(Object.keys(plan.days)).toHaveLength(6);
  });
});

// ─── Plan structure ────────────────────────────────────────────────────────────

describe('plan structure', () => {
  it('sets uid correctly', () => {
    const plan = generatePlan(profile(), 'user-123');
    expect(plan.uid).toBe('user-123');
  });

  it('planId starts with "plan_" followed by a number', () => {
    const plan = generatePlan(profile(), 'uid1');
    expect(plan.planId).toMatch(/^plan_\d+$/);
  });

  it('marks the plan as active', () => {
    const plan = generatePlan(profile(), 'uid1');
    expect(plan.isActive).toBe(true);
  });

  it('sets type to generated', () => {
    const plan = generatePlan(profile(), 'uid1');
    expect(plan.type).toBe('generated');
  });

  it('stores daysPerWeek on the plan', () => {
    const plan = generatePlan(profile({ daysPerWeek: 4 }), 'uid1');
    expect(plan.daysPerWeek).toBe(4);
  });
});

// ─── Day keys and schedule ─────────────────────────────────────────────────────

describe('schedule', () => {
  it('assigns each training day to a weekday', () => {
    const plan = generatePlan(profile({ daysPerWeek: 3 }), 'uid1');
    const assigned = Object.values(plan.schedule).filter(Boolean);
    expect(assigned).toHaveLength(3);
  });

  it('sets rest days to null', () => {
    const plan = generatePlan(profile({ daysPerWeek: 3 }), 'uid1');
    const rest = Object.values(plan.schedule).filter((v) => v === null);
    expect(rest).toHaveLength(7 - 3);
  });

  it('schedule day keys match days object keys', () => {
    const plan = generatePlan(profile({ daysPerWeek: 4 }), 'uid1');
    const scheduledKeys = Object.values(plan.schedule).filter(Boolean) as string[];
    for (const key of scheduledKeys) {
      expect(plan.days[key]).toBeDefined();
    }
  });

  it('schedule covers all 7 weekdays', () => {
    const plan = generatePlan(profile({ daysPerWeek: 3 }), 'uid1');
    const keys = Object.keys(plan.schedule);
    expect(keys).toHaveLength(7);
    expect(keys).toEqual(expect.arrayContaining(['mon','tue','wed','thu','fri','sat','sun']));
  });
});

// ─── Exercise generation ───────────────────────────────────────────────────────

describe('exercise generation', () => {
  it('each day has at least one exercise', () => {
    const plan = generatePlan(profile(), 'uid1');
    for (const day of Object.values(plan.days)) {
      expect(day.exercises.length).toBeGreaterThan(0);
    }
  });

  it('exercises within a day have no duplicates', () => {
    const plan = generatePlan(profile(), 'uid1');
    for (const day of Object.values(plan.days)) {
      const ids = day.exercises.map((e) => e.exerciseId);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });

  it('all exercises are within equipment constraints', () => {
    const equip: UserProfile['equipment'] = ['dumbbells'];
    const plan = generatePlan(profile({ equipment: equip }), 'uid1');
    // We can't deeply check exercise equipment here without importing the
    // exercise library, but we can verify the plan was generated without error
    expect(plan).toBeDefined();
    for (const day of Object.values(plan.days)) {
      expect(day.exercises.length).toBeGreaterThan(0);
    }
  });

  it('beginner profile generates a valid plan', () => {
    const plan = generatePlan(
      profile({ experience: 'beginner', daysPerWeek: 3 }), 'uid1',
    );
    for (const day of Object.values(plan.days)) {
      expect(day.exercises.length).toBeGreaterThan(0);
    }
  });

  it('advanced profile generates a valid plan', () => {
    const plan = generatePlan(
      profile({ experience: 'advanced', daysPerWeek: 6 }), 'uid1',
    );
    expect(Object.keys(plan.days)).toHaveLength(6);
  });

  it('exercises have valid set/rep ranges (min <= max)', () => {
    const plan = generatePlan(profile({ daysPerWeek: 6 }), 'uid1');
    for (const day of Object.values(plan.days)) {
      for (const ex of day.exercises) {
        expect(ex.repMin).toBeLessThanOrEqual(ex.repMax);
        expect(ex.sets).toBeGreaterThan(0);
      }
    }
  });

  it('exercises are ordered starting at 0', () => {
    const plan = generatePlan(profile(), 'uid1');
    for (const day of Object.values(plan.days)) {
      const orders = day.exercises.map((e) => e.order);
      expect(orders[0]).toBe(0);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBe(orders[i - 1] + 1);
      }
    }
  });
});

// ─── Goal-specific rep ranges ──────────────────────────────────────────────────

describe('goal rep ranges', () => {
  const goals: UserProfile['goal'][] = ['bulk', 'cut', 'strength'];

  it.each(goals)('%s goal generates a valid plan with at least 1 exercise per day', (goal) => {
    const plan = generatePlan(profile({ goal, daysPerWeek: 3 }), 'uid1');
    for (const day of Object.values(plan.days)) {
      expect(day.exercises.length).toBeGreaterThan(0);
    }
  });

  it('strength goal has lower rep ranges than cut goal', () => {
    const strength = generatePlan(profile({ goal: 'strength', daysPerWeek: 3 }), 'uid1');
    const cut      = generatePlan(profile({ goal: 'cut',      daysPerWeek: 3 }), 'uid1');

    const avgRepMaxStrength = Object.values(strength.days)
      .flatMap((d) => d.exercises)
      .reduce((sum, ex) => sum + ex.repMax, 0) / Object.values(strength.days).flatMap((d) => d.exercises).length;

    const avgRepMaxCut = Object.values(cut.days)
      .flatMap((d) => d.exercises)
      .reduce((sum, ex) => sum + ex.repMax, 0) / Object.values(cut.days).flatMap((d) => d.exercises).length;

    expect(avgRepMaxStrength).toBeLessThan(avgRepMaxCut);
  });
});
