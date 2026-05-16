import { create } from 'zustand';
import { doc, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { EXERCISE_MAP } from '../data/exercises';
import type { WorkoutPlan, ExercisePlan, LastSession, MuscleGroup } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ActiveSet {
  setNumber:     number;
  prevWeight:    number;
  prevReps:      number;
  weight:        string;
  reps:          string;
  completed:     boolean;
  weightEdited:  boolean;
  repsEdited:    boolean;
}

export interface ActiveExercise {
  exerciseId:     string;
  exerciseName:   string;
  primaryMuscles: MuscleGroup[];
  targetSets:     number;
  repMin:         number;
  repMax:         number;
  restSeconds:    number;
  sets:           ActiveSet[];
}

interface WorkoutStore {
  sessionId:     string | null;
  dayKey:        string | null;
  dayName:       string;
  startTime:     Date | null;
  exercises:     ActiveExercise[];
  status:        'idle' | 'active';
  elapsed:       number;
  currentExIdx:  number;

  // Rest timer
  restActive:    boolean;
  restRemaining: number;
  restTotal:     number;
  restStarted:   number | null;

  startSession:     (uid: string, plan: WorkoutPlan, dayKey: string, lastSession?: LastSession) => void;
  startCustom:      (uid: string, name: string, exercises: ActiveExercise[]) => void;
  updateSetField:   (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  toggleComplete:   (exIdx: number, setIdx: number) => void;
  logSet:           (exIdx: number, setIdx: number, weight: string, reps: string) => void;
  focusExercise:    (idx: number) => void;
  swapExercise:     (exIdx: number, id: string, name: string, muscles: MuscleGroup[]) => void;
  addExercise:      (ex: ActiveExercise) => void;
  removeExercise:   (exIdx: number) => void;
  addSet:           (exIdx: number) => void;
  removeSet:        (exIdx: number) => void;
  tick:             () => void;
  startRest:        (seconds: number) => void;
  skipRest:         () => void;
  finishSession:    (uid: string) => Promise<void>;
  clearSession:     () => void;

  totalSets:          () => number;
  doneSets:           () => number;
  firstIncompleteSet: () => { exIdx: number; setIdx: number } | null;
}

// ── Lower body muscles (need larger overload increment) ────────────────────────

const PROGRESSION_LBS = 5;

function overloadDelta(): number { return PROGRESSION_LBS; }

// ── Build active exercises from plan + last session ────────────────────────────

function buildExercises(
  planExercises: ExercisePlan[],
  lastSession?: LastSession,
): ActiveExercise[] {
  return planExercises.map(pe => {
    const meta           = EXERCISE_MAP[pe.exerciseId];
    const primaryMuscles: MuscleGroup[] = meta?.muscleGroups.primary ?? [];
    const lastEx         = lastSession?.exercises.find(e => e.exerciseId === pe.exerciseId);
    const lastSets       = lastEx?.sets ?? [];

    let suggestedWeight = 0;
    let suggestedReps   = pe.repMin;

    if (lastSets.length > 0) {
      const avg           = lastSets.reduce((s, set) => s + set.weight, 0) / lastSets.length;
      suggestedReps       = Math.round(lastSets.reduce((s, set) => s + set.reps, 0) / lastSets.length);
      const hitTopOfRange = lastSets.every(s => s.reps >= pe.repMax && s.completed);
      const raw           = hitTopOfRange ? avg + overloadDelta() : avg;
      suggestedWeight     = Math.round(raw / 2.5) * 2.5;
    }

    const sets: ActiveSet[] = Array.from({ length: pe.sets }, (_, i) => {
      const prev = lastSets[i];
      return {
        setNumber:    i + 1,
        prevWeight:   prev?.weight ?? 0,
        prevReps:     prev?.reps   ?? 0,
        weight:       suggestedWeight > 0 ? String(suggestedWeight) : '',
        reps:         suggestedReps   > 0 ? String(suggestedReps)   : String(pe.repMin),
        completed:    false,
        weightEdited: false,
        repsEdited:   false,
      };
    });

    return {
      exerciseId: pe.exerciseId, exerciseName: pe.exerciseName,
      primaryMuscles, targetSets: pe.sets,
      repMin: pe.repMin, repMax: pe.repMax, restSeconds: pe.restSeconds,
      sets,
    };
  });
}

// ── Store ──────────────────────────────────────────────────────────────────────

const INITIAL = {
  sessionId: null, dayKey: null, dayName: '', startTime: null,
  exercises: [], status: 'idle' as const, elapsed: 0, currentExIdx: 0,
  restActive: false, restRemaining: 0, restTotal: 0, restStarted: null,
};

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  ...INITIAL,

  totalSets() {
    return get().exercises.reduce((n, ex) => n + ex.sets.length, 0);
  },
  doneSets() {
    return get().exercises.reduce((n, ex) => n + ex.sets.filter(s => s.completed).length, 0);
  },
  firstIncompleteSet() {
    const { exercises, currentExIdx } = get();
    for (let offset = 0; offset < exercises.length; offset++) {
      const idx  = (currentExIdx + offset) % exercises.length;
      const ex   = exercises[idx];
      const setI = ex.sets.findIndex(s => !s.completed);
      if (setI !== -1) return { exIdx: idx, setIdx: setI };
    }
    return null;
  },

  startSession(uid, plan, dayKey, lastSession) {
    const day = plan.days[dayKey];
    if (!day) return;
    const exercises = buildExercises(day.exercises, lastSession);
    const sessionId = `log_${Date.now()}`;
    set({ ...INITIAL, sessionId, dayKey, dayName: day.name, startTime: new Date(), exercises, status: 'active' });
    setDoc(doc(db, 'users', uid, 'logs', sessionId), {
      logId: sessionId, uid, planId: plan.planId, dayKey,
      dayName: day.name, startTime: Timestamp.now(), endTime: null,
      status: 'in_progress', exercises: [],
    }).catch(() => {});
  },

  startCustom(uid, name, exercises) {
    const sessionId = `log_custom_${Date.now()}`;
    set({ ...INITIAL, sessionId, dayKey: 'custom', dayName: name, startTime: new Date(), exercises, status: 'active' });
  },

  updateSetField(exIdx, setIdx, field, value) {
    set(state => ({
      exercises: state.exercises.map((ex, i) =>
        i !== exIdx ? ex : {
          ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : {
            ...s,
            [field]: value,
            ...(field === 'weight' ? { weightEdited: true } : { repsEdited: true }),
          }),
        }
      ),
    }));
  },

  toggleComplete(exIdx, setIdx) {
    set(state => ({
      exercises: state.exercises.map((ex, i) =>
        i !== exIdx ? ex : {
          ...ex, sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, completed: !s.completed }),
        }
      ),
    }));
  },

  logSet(exIdx, setIdx, weight, reps) {
    set(state => {
      const exercises = state.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex, sets: ex.sets.map((s, j) => {
            if (j === setIdx) return { ...s, weight, reps, completed: true };
            // Propagate weight forward to uncompleted sets (so user doesn't re-enter)
            if (j > setIdx && !s.completed && !s.weight) return { ...s, weight };
            return s;
          }),
        };
      });

      // Auto-advance to next exercise with incomplete sets
      let nextExIdx = state.currentExIdx;
      for (let offset = 0; offset < exercises.length; offset++) {
        const idx = (state.currentExIdx + offset) % exercises.length;
        if (exercises[idx].sets.some(s => !s.completed)) { nextExIdx = idx; break; }
      }

      // Check if all done — no rest needed
      const allDone = exercises.every(ex => ex.sets.every(s => s.completed));
      const restSeconds = state.exercises[exIdx]?.restSeconds ?? 90;

      return {
        exercises,
        currentExIdx: nextExIdx,
        restActive:    !allDone,
        restRemaining: !allDone ? restSeconds : 0,
        restTotal:     !allDone ? restSeconds : 0,
        restStarted:   !allDone ? Date.now() : null,
      };
    });
  },

  focusExercise(idx) {
    set({ currentExIdx: Math.max(0, Math.min(idx, get().exercises.length - 1)) });
  },

  swapExercise(exIdx, id, name, muscles) {
    set(state => ({
      exercises: state.exercises.map((ex, i) =>
        i !== exIdx ? ex : {
          ...ex, exerciseId: id, exerciseName: name, primaryMuscles: muscles,
          sets: ex.sets.map(s => ({ ...s, prevWeight: 0, prevReps: 0, weight: '', reps: String(ex.repMin), completed: false })),
        }
      ),
    }));
  },

  addExercise(ex) {
    set(state => ({ exercises: [...state.exercises, ex] }));
  },

  removeExercise(exIdx) {
    set(state => ({ exercises: state.exercises.filter((_, i) => i !== exIdx) }));
  },

  addSet(exIdx) {
    set(state => ({
      exercises: state.exercises.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, {
            setNumber: ex.sets.length + 1, prevWeight: 0, prevReps: 0,
            weight: last?.weight ?? '', reps: last?.reps ?? String(ex.repMin),
            completed: false, weightEdited: true, repsEdited: true,
          }],
        };
      }),
    }));
  },

  removeSet(exIdx) {
    set(state => ({
      exercises: state.exercises.map((ex, i) =>
        i !== exIdx || ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.slice(0, -1) }
      ),
    }));
  },

  tick() {
    set(state => {
      const now     = Date.now();
      const elapsed = state.startTime
        ? Math.floor((now - state.startTime.getTime()) / 1000)
        : state.elapsed;
      const restRemaining = state.restActive && state.restStarted
        ? Math.max(0, state.restTotal - Math.floor((now - state.restStarted) / 1000))
        : state.restRemaining;
      return {
        elapsed,
        restRemaining,
        restActive: restRemaining > 0 ? state.restActive : false,
      };
    });
  },

  startRest(seconds: number) {
    set({ restActive: true, restRemaining: seconds, restTotal: seconds, restStarted: Date.now() });
  },

  skipRest() {
    set({ restActive: false, restRemaining: 0, restStarted: null });
  },

  async finishSession(uid) {
    const { sessionId, dayKey, dayName, startTime, exercises } = get();
    if (!sessionId || !dayKey || !startTime) return;
    const endTime    = new Date();
    const duration   = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    const exerciseLog = exercises.map(ex => ({
      exerciseId: ex.exerciseId, name: ex.exerciseName,
      sets: ex.sets.map(s => ({
        setNumber: s.setNumber,
        weight:    parseFloat(s.weight) || 0,
        reps:      parseInt(s.reps) || 0,
        completed: s.completed,
        rpe:       null,
      })),
    }));
    const totalVolume = exerciseLog.reduce(
      (t, ex) => t + ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0), 0
    );

    await setDoc(doc(db, 'users', uid, 'logs', sessionId), {
      logId: sessionId, uid, dayKey, dayName,
      startTime: Timestamp.fromDate(startTime), endTime: Timestamp.fromDate(endTime),
      duration, status: 'complete', exercises: exerciseLog,
      summary: { totalVolume, duration },
    });

    await updateDoc(doc(db, 'users', uid), {
      [`lastSessions.${dayKey}`]: {
        date: Timestamp.fromDate(endTime),
        exercises: exerciseLog.map(ex => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
        })),
      },
      'stats.totalWorkouts': increment(1),
      'stats.lastWorkoutDate': Timestamp.fromDate(endTime),
    });

    set({ status: 'idle', restActive: false, restRemaining: 0 });
  },

  clearSession() {
    set(INITIAL);
  },
}));
