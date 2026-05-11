export interface SetRecord {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface ExerciseRecord {
  sets: SetRecord[];
  date: number; // epoch ms
}

export function getLastEntry(history: ExerciseRecord[]): ExerciseRecord | null {
  if (!history.length) return null;
  return history.reduce((latest, entry) =>
    entry.date > latest.date ? entry : latest,
  );
}

export function getCompletedSets(sets: SetRecord[]): SetRecord[] {
  return sets.filter((s) => s.completed);
}

export function getBestSet(sets: SetRecord[]): SetRecord | null {
  const completed = getCompletedSets(sets);
  if (!completed.length) return null;
  return completed.reduce((best, s) =>
    s.weight * s.reps > best.weight * best.reps ? s : best,
  );
}

export function getTopWeight(sets: SetRecord[]): number | null {
  const completed = getCompletedSets(sets);
  if (!completed.length) return null;
  return Math.max(...completed.map((s) => s.weight));
}

export function formatLastWeekSummary(entry: ExerciseRecord | null): string {
  if (!entry) return '';
  const completed = getCompletedSets(entry.sets);
  if (!completed.length) return '';
  const topWeight = getTopWeight(entry.sets)!;
  const avgReps = Math.round(
    completed.reduce((sum, s) => sum + s.reps, 0) / completed.length,
  );
  return `${completed.length}×${avgReps} @ ${topWeight}kg`;
}

export function getTotalVolume(sets: SetRecord[]): number {
  return getCompletedSets(sets).reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function didImprove(
  current: ExerciseRecord | null,
  previous: ExerciseRecord | null,
): boolean {
  if (!current || !previous) return false;
  return getTotalVolume(current.sets) > getTotalVolume(previous.sets);
}
