import { Timestamp } from 'firebase/firestore';
import { EXERCISES, filterByEquipment } from '../data/exercises';
import type {
  UserProfile, WorkoutPlan, WorkoutDay, ExercisePlan,
  MuscleGroup, Equipment, SplitType, Exercise, WeekDay,
} from '../types';

// ── Volume by goal ─────────────────────────────────────────────────────────────

type GoalKey = 'bulk' | 'cut' | 'strength';

interface SetSpec {
  sets:   number;
  repMin: number;
  repMax: number;
  rest:   number; // seconds
}

type GoalSpec = Record<GoalKey, SetSpec>;

// ── Slot descriptor ────────────────────────────────────────────────────────────

interface Slot {
  muscle:    MuscleGroup;
  compound:  boolean;
  fallback?: MuscleGroup; // if no exercise found
  spec:      GoalSpec;
}

function slot(
  muscle: MuscleGroup,
  compound: boolean,
  bulk: [number, number, number, number],
  strength: [number, number, number, number],
  cut: [number, number, number, number],
  fallback?: MuscleGroup,
): Slot {
  return {
    muscle, compound, fallback,
    spec: {
      bulk:     { sets: bulk[0],     repMin: bulk[1],     repMax: bulk[2],     rest: bulk[3]     },
      strength: { sets: strength[0], repMin: strength[1], repMax: strength[2], rest: strength[3] },
      cut:      { sets: cut[0],      repMin: cut[1],      repMax: cut[2],      rest: cut[3]      },
    },
  };
}

// ── Day templates ──────────────────────────────────────────────────────────────

interface DayDef {
  name:     string;
  splitKey: string;
  focus:    MuscleGroup[];
  slots:    Slot[];
}

// ─── FULL BODY (2-3 days/wk) — 20-24 sets ────────────────────────────────────

const FULL_BODY: DayDef[] = [
  {
    name: 'Full Body A', splitKey: 'full_body', focus: ['chest', 'back', 'quads'],
    slots: [
      slot('chest',      true,  [4,6,10,120], [5,3,5,240],  [3,12,15,60]),
      slot('back',       true,  [4,6,10,120], [5,3,5,240],  [3,12,15,60]),
      slot('quads',      true,  [4,6,10,120], [5,3,5,240],  [4,12,15,60]),
      slot('hamstrings', true,  [3,8,12,90],  [4,4,6,180],  [3,12,15,60]),
      slot('shoulders',  true,  [3,8,12,90],  [3,5,7,120],  [3,12,15,60]),
      slot('biceps',     false, [3,10,12,60], [3,6,10,90],  [3,12,15,45]),
      slot('triceps',    false, [2,10,15,60], [2,8,10,90],  [2,12,15,45]),
    ],
  },
  {
    name: 'Full Body B', splitKey: 'full_body', focus: ['back', 'shoulders', 'hamstrings'],
    slots: [
      slot('back',       true,  [4,6,10,120], [5,3,5,240],  [3,12,15,60]),
      slot('quads',      true,  [3,8,12,90],  [4,4,6,180],  [3,12,15,60]),
      slot('chest',      true,  [3,8,12,90],  [4,4,6,180],  [3,12,15,60]),
      slot('hamstrings', true,  [4,8,12,90],  [4,4,6,180],  [3,12,15,60]),
      slot('shoulders',  true,  [3,8,12,90],  [3,5,7,120],  [3,12,15,60]),
      slot('glutes',     true,  [3,10,12,90], [3,6,10,120], [3,12,15,60]),
      slot('biceps',     false, [2,10,12,60], [2,6,10,90],  [2,12,15,45]),
    ],
  },
  {
    name: 'Full Body C', splitKey: 'full_body', focus: ['chest', 'quads', 'biceps'],
    slots: [
      slot('chest',     true,  [4,6,10,120], [5,3,5,240], [3,12,15,60]),
      slot('back',      true,  [4,6,10,120], [5,3,5,240], [3,12,15,60]),
      slot('quads',     true,  [3,8,10,90],  [4,4,6,180], [3,12,15,60]),
      slot('glutes',    true,  [3,8,12,90],  [3,5,8,120], [3,12,15,60]),
      slot('shoulders', false, [3,10,15,60], [3,6,10,90], [3,12,15,45]),
      slot('biceps',    false, [3,10,12,60], [3,6,10,90], [3,12,15,45]),
      slot('calves',    false, [2,15,20,45], [2,10,15,60],[2,15,20,30]),
    ],
  },
];

// ─── UPPER / LOWER (4 days/wk) — 15-18 sets ──────────────────────────────────

const UPPER_LOWER: DayDef[] = [
  {
    name: 'Upper A — Push', splitKey: 'push', focus: ['chest', 'shoulders', 'triceps'],
    slots: [
      slot('chest',    true,  [4,6,10,120], [5,3,5,240],  [3,12,15,60]),
      slot('chest',    false, [3,10,14,60], [3,6,10,90],  [3,12,16,45]),
      slot('shoulders',true,  [4,8,12,90],  [4,4,6,180],  [3,12,15,60]),
      slot('shoulders',false, [3,12,20,60], [3,8,12,60],  [3,15,20,45]),
      slot('triceps',  false, [3,10,14,60], [3,8,12,90],  [3,12,15,45]),
    ],
  },
  {
    name: 'Lower A — Quad Focus', splitKey: 'legs', focus: ['quads', 'hamstrings', 'calves'],
    slots: [
      slot('quads',     true,  [5,5,8,180],  [5,3,5,300],  [4,12,15,60]),
      slot('quads',     true,  [3,10,15,90], [4,5,8,180],  [3,12,16,60]),
      slot('hamstrings',true,  [4,8,12,90],  [4,4,6,180],  [3,12,15,60]),
      slot('hamstrings',false, [3,12,15,60], [3,8,12,90],  [3,12,16,45]),
      slot('calves',    false, [3,15,20,45], [3,10,15,60], [2,15,20,30]),
    ],
  },
  {
    name: 'Upper B — Pull', splitKey: 'back', focus: ['back', 'biceps', 'traps'],
    slots: [
      slot('back',     true,  [4,6,10,120], [5,3,5,240], [3,12,15,60]),
      slot('lats',     true,  [4,8,12,90],  [4,4,6,180], [3,12,15,60]),
      slot('back',     false, [3,10,14,60], [3,6,10,90], [3,12,15,45], 'traps'),
      slot('shoulders',false, [3,15,20,45], [3,10,15,60],[3,15,20,30]),
      slot('biceps',   false, [4,10,14,60], [3,6,10,90], [3,12,15,45]),
    ],
  },
  {
    name: 'Lower B — Posterior Chain', splitKey: 'lower', focus: ['hamstrings', 'glutes', 'calves'],
    slots: [
      slot('hamstrings',true,  [4,6,10,120], [5,3,5,240],  [3,12,15,60]),
      slot('glutes',    true,  [3,10,14,90], [4,5,8,180],  [4,12,15,60]),
      slot('quads',     true,  [3,10,14,90], [3,6,10,120], [3,12,15,60]),
      slot('hamstrings',false, [3,12,15,60], [3,8,12,90],  [3,12,15,45]),
      slot('calves',    false, [3,15,20,45], [3,10,15,60], [2,15,20,30]),
    ],
  },
];

// ─── PPL (5-6 days/wk) — 13-14 sets ─────────────────────────────────────────

const PPL: DayDef[] = [
  {
    name: 'Push A — Chest', splitKey: 'chest', focus: ['chest', 'shoulders', 'triceps'],
    slots: [
      slot('chest',    true,  [4,6,10,120], [5,3,5,240],  [3,12,15,60]),
      slot('chest',    true,  [3,8,12,90],  [3,5,7,180],  [3,12,15,60]),
      slot('chest',    false, [2,12,16,60], [2,8,12,60],  [2,14,18,45]),
      slot('shoulders',false, [2,15,20,45], [2,10,15,60], [2,15,20,30]),
      slot('triceps',  false, [2,12,16,45], [2,8,12,60],  [2,12,16,30]),
    ],
  },
  {
    name: 'Pull A — Back', splitKey: 'back', focus: ['back', 'lats', 'biceps'],
    slots: [
      slot('lats',   true,  [4,6,10,120], [4,4,6,180], [3,12,15,60]),
      slot('back',   true,  [4,6,10,120], [4,4,6,180], [3,12,15,60]),
      slot('back',   false, [3,10,14,60], [3,6,10,90], [2,12,16,45], 'traps'),
      slot('biceps', false, [3,10,14,60], [3,6,10,90], [2,12,16,45]),
    ],
  },
  {
    name: 'Legs A — Quads', splitKey: 'legs', focus: ['quads', 'hamstrings', 'calves'],
    slots: [
      slot('quads',     true,  [4,5,8,180],  [5,3,5,300],  [3,12,15,60]),
      slot('quads',     true,  [3,10,15,90], [3,5,8,180],  [3,12,16,60]),
      slot('hamstrings',true,  [3,8,12,90],  [3,5,8,180],  [3,12,15,60]),
      slot('hamstrings',false, [2,12,16,60], [2,8,12,90],  [2,12,16,45]),
      slot('calves',    false, [2,15,20,45], [2,10,15,60], [2,15,20,30]),
    ],
  },
  {
    name: 'Push B — Shoulders', splitKey: 'push', focus: ['shoulders', 'chest', 'triceps'],
    slots: [
      slot('shoulders',true,  [4,6,10,120], [5,3,5,240],  [3,12,15,60]),
      slot('chest',    true,  [3,8,12,90],  [3,5,7,180],  [3,12,15,60]),
      slot('chest',    false, [2,12,16,60], [2,8,12,60],  [2,14,18,45]),
      slot('shoulders',false, [2,15,20,45], [2,10,15,60], [2,15,20,30]),
      slot('triceps',  false, [2,12,16,45], [2,8,12,60],  [2,12,16,30]),
    ],
  },
  {
    name: 'Pull B — Lats', splitKey: 'pull', focus: ['lats', 'back', 'biceps'],
    slots: [
      slot('lats',   true,  [4,6,10,120], [4,4,6,180], [3,12,15,60]),
      slot('back',   true,  [3,8,12,90],  [3,5,8,180], [2,12,15,60]),
      slot('back',   false, [3,10,14,60], [3,6,10,90], [2,12,16,45]),
      slot('biceps', false, [3,10,14,60], [3,6,10,90], [2,12,16,45]),
    ],
  },
  {
    name: 'Legs B — Posterior', splitKey: 'legs', focus: ['hamstrings', 'glutes', 'quads'],
    slots: [
      slot('hamstrings',true,  [4,6,10,120], [5,3,5,300],  [3,12,15,60]),
      slot('glutes',    true,  [3,10,12,90], [3,5,8,180],  [3,12,15,60]),
      slot('hamstrings',false, [2,12,15,60], [2,8,12,90],  [2,12,15,45]),
      slot('quads',     false, [2,12,16,60], [2,8,12,90],  [2,12,16,45]),
      slot('calves',    false, [2,15,20,45], [2,10,15,60], [2,15,20,30]),
    ],
  },
];

// ── Default schedules ──────────────────────────────────────────────────────────

const DAYS: WeekDay[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function defaultSchedule(daysPerWeek: number, totalDays: number): Record<WeekDay, string | null> {
  const trainingDays: Record<number, WeekDay[]> = {
    2: ['tue', 'sat'],
    3: ['mon', 'wed', 'fri'],
    4: ['mon', 'tue', 'thu', 'fri'],
    5: ['mon', 'tue', 'wed', 'fri', 'sat'],
    6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  };
  const active = trainingDays[daysPerWeek] ?? ['mon'];
  const sched = {} as Record<WeekDay, string | null>;
  DAYS.forEach(d => { sched[d] = null; });
  active.slice(0, totalDays).forEach((d, i) => { sched[d] = `day_${i + 1}`; });
  return sched;
}

// ── Exercise picker ────────────────────────────────────────────────────────────

function difficultyRank(d: string) { return d === 'beginner' ? 0 : d === 'intermediate' ? 1 : 2; }

function pickExercise(
  muscle: MuscleGroup,
  compound: boolean,
  equipment: Equipment[],
  experience: string,
  used: Set<string>,
): Exercise | null {
  const maxRank = difficultyRank(experience);
  const pool = EXERCISES.filter(ex => {
    if (used.has(ex.exerciseId)) return false;
    if (difficultyRank(ex.difficulty) > maxRank) return false;
    if (!ex.equipment.some(eq => equipment.includes(eq))) return false;
    if (!ex.muscleGroups.primary.includes(muscle)) return false;
    if (compound && ex.category !== 'compound') return false;
    return true;
  });
  if (pool.length === 0 && compound) {
    // Relax compound requirement
    return pickExercise(muscle, false, equipment, experience, used);
  }
  // Prefer compound if available, then pick best
  pool.sort((a, b) => {
    if (compound) {
      const aC = a.category === 'compound' ? 1 : 0;
      const bC = b.category === 'compound' ? 1 : 0;
      if (aC !== bC) return bC - aC;
    }
    return 0;
  });
  return pool[0] ?? null;
}

function buildDay(def: DayDef, profile: UserProfile, goal: GoalKey): WorkoutDay {
  const used      = new Set<string>();
  const exercises: ExercisePlan[] = [];
  let order = 0;

  for (const s of def.slots) {
    const spec    = s.spec[goal];
    const muscle  = s.muscle;
    let ex = pickExercise(muscle, s.compound, profile.equipment, profile.experience, used);
    if (!ex && s.fallback) {
      ex = pickExercise(s.fallback, s.compound, profile.equipment, profile.experience, used);
    }
    if (!ex) continue;
    used.add(ex.exerciseId);
    exercises.push({
      exerciseId:      ex.exerciseId,
      exerciseName:    ex.name,
      order:           order++,
      sets:            spec.sets,
      repMin:          spec.repMin,
      repMax:          spec.repMax,
      suggestedWeight: 0,
      restSeconds:     spec.rest,
    });
  }

  return { name: def.name, splitKey: def.splitKey, focus: def.focus, exercises };
}

// ── Main export ────────────────────────────────────────────────────────────────

export function generatePlan(profile: UserProfile, uid: string): WorkoutPlan {
  const split: SplitType =
    profile.daysPerWeek <= 3 ? 'full_body' :
    profile.daysPerWeek === 4 ? 'upper_lower' : 'ppl';

  const templates =
    split === 'full_body'    ? FULL_BODY.slice(0, profile.daysPerWeek) :
    split === 'upper_lower'  ? UPPER_LOWER :
    PPL.slice(0, profile.daysPerWeek);

  const goal = profile.goal as GoalKey;

  const days: Record<string, WorkoutDay> = {};
  templates.forEach((def, i) => {
    days[`day_${i + 1}`] = buildDay(def, profile, goal);
  });

  const schedule = defaultSchedule(profile.daysPerWeek, templates.length);

  const splitName =
    split === 'full_body'   ? 'Full Body' :
    split === 'upper_lower' ? 'Upper / Lower' : 'Push / Pull / Legs';

  return {
    planId:      `plan_${Date.now()}`,
    uid,
    name:        splitName,
    type:        'generated',
    split,
    daysPerWeek: profile.daysPerWeek,
    createdAt:   Timestamp.now(),
    isActive:    true,
    days,
    schedule,
  };
}
