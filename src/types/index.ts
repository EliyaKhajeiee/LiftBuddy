import type { Timestamp } from 'firebase/firestore';

// ─── Enums / Unions ────────────────────────────────────────────────────────────

export type Goal             = 'bulk' | 'cut' | 'strength';
export type ExperienceLevel  = 'beginner' | 'intermediate' | 'advanced';
export type Location         = 'gym' | 'home';
export type SplitType        = 'full_body' | 'upper_lower' | 'ppl';
export type CompletionStatus = 'complete' | 'partial' | 'skipped';
export type ProgressTrend    = 'increasing' | 'stable' | 'decreasing' | 'plateau';
export type MovementPattern  = 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'isolation';
export type ExerciseCategory = 'compound' | 'isolation';
export type FriendReqStatus  = 'pending' | 'accepted' | 'declined';
export type WorkoutStatus    = 'in_progress' | 'complete' | 'skipped';

export type Equipment =
  | 'barbell' | 'dumbbells' | 'cables' | 'machines'
  | 'kettlebell' | 'bodyweight' | 'resistance_bands' | 'pull_up_bar';

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'forearms' | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'core' | 'traps' | 'lats' | 'delts';

// ─── User ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  age:         number;
  height:      number;       // cm
  weight:      number;       // kg
  goal:        Goal;
  experience:  ExperienceLevel;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  location:    Location;
  equipment:   Equipment[];
  muscleFocus: MuscleGroup[];
  injuries:    string[];
}

export interface UserStats {
  currentWeight:   number;
  weightHistory:   { date: Timestamp; weight: number }[];
  currentStreak:   number;
  longestStreak:   number;
  totalWorkouts:   number;
  lastWorkoutDate: Timestamp | null;
}

export interface UserSettings {
  onboardingComplete: boolean;
  notifications:      boolean;
  units:              'metric' | 'imperial';
  workoutMode:        'timer' | 'quick'; // 'timer' = rest countdown, 'quick' = all sets visible
}

export interface LastSessionExercise {
  exerciseId: string;
  sets: { weight: number; reps: number; completed: boolean }[];
}

export interface LastSession {
  date: Timestamp;
  exercises: LastSessionExercise[];
}

export interface AppUser {
  uid:          string;
  email:        string;
  displayName:  string;
  avatarUrl:    string | null;
  createdAt:    Timestamp;
  profile:      UserProfile;
  stats:        UserStats;
  settings:     UserSettings;
  plan?:        WorkoutPlan;
  lastSessions?: Record<string, LastSession>;
}

// Minimal user object kept in auth store (not full Firestore doc)
export interface AuthUser {
  uid:                string;
  email:              string;
  displayName:        string | null;
  onboardingComplete: boolean;
}

// ─── Exercises ─────────────────────────────────────────────────────────────────

export interface Exercise {
  exerciseId:     string;
  name:           string;
  category:       ExerciseCategory;
  muscleGroups: {
    primary:   MuscleGroup[];
    secondary: MuscleGroup[];
  };
  equipment:      Equipment[];
  difficulty:     ExperienceLevel;
  movementPattern:MovementPattern;
  instructions:   string[];
  videoUrl:       string | null;
  imageUrl:       string | null;
}

// ─── Workout Plans ─────────────────────────────────────────────────────────────

export interface ExercisePlan {
  exerciseId:      string;
  exerciseName:    string;
  order:           number;
  sets:            number;
  repMin:          number;
  repMax:          number;
  suggestedWeight: number;
  restSeconds:     number;
}

export interface WorkoutSession {
  name:      string;
  exercises: ExercisePlan[];
}

export interface WorkoutDay {
  name:      string;
  focus:     MuscleGroup[];
  exercises: ExercisePlan[];  // primary session (backward-compat)
  splitKey:  string; // for muscle-specific quotes: 'legs','chest','back','arms','push','pull','full_body','shoulders'
  sessions?: WorkoutSession[]; // all sessions; sessions[0] matches exercises above
}

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface WorkoutPlan {
  planId:      string;
  uid:         string;
  name:        string;
  type:        'generated' | 'custom';
  split:       SplitType;
  daysPerWeek: number;
  createdAt:   Timestamp;
  isActive:    boolean;
  days:        Record<string, WorkoutDay>;
  schedule:    Record<WeekDay, string | null>; // weekday -> dayKey | null (rest)
}

// ─── Workout Logs ──────────────────────────────────────────────────────────────

export interface SetLog {
  setNumber: number;
  weight:    number;
  reps:      number;
  completed: boolean;
  rpe:       number | null; // Rate of Perceived Exertion 1–10
}

export interface ExerciseLog {
  exerciseId:       string;
  name:             string;
  sets:             SetLog[];
  note:             string;
  personalRecord:   boolean;
  completionStatus: CompletionStatus;
}

export interface WorkoutSummary {
  totalSets:    number;
  totalVolume:  number;  // sum(weight × reps) across all completed sets
  muscleGroups: MuscleGroup[];
  prs:          string[]; // exercise names that hit PRs this session
  duration:     number;   // minutes
}

export interface WorkoutLog {
  logId:     string;
  uid:       string;
  planId:    string;
  dayKey:    string;
  dayName:   string;
  startTime: Timestamp;
  endTime:   Timestamp | null;
  duration:  number;
  status:    WorkoutStatus;
  exercises: Record<string, ExerciseLog>;
  summary:   WorkoutSummary;
}

// ─── Progressive Overload / Progress ──────────────────────────────────────────

export interface ProgressEntry {
  logId:          string;
  date:           Timestamp;
  sets:           SetLog[];
  avgWeight:      number;
  totalVolume:    number;
  hitTopOfRange:  boolean;
  failedMinReps:  boolean;
}

export type OverloadAction =
  | 'increase'
  | 'decrease'
  | 'maintain'
  | 'plateau_expand_reps'
  | 'plateau_add_volume'
  | 'plateau_swap_exercise'
  | 'deload';

export interface OverloadDecision {
  action:        OverloadAction;
  newWeight:     number;
  newRepRange?:  { min: number; max: number };
  newSets?:      number;
  swapExercise?: string;  // exerciseId to swap to
  message:       string;  // shown in UI
  isPR:          boolean;
}

export interface ExerciseProgress {
  exerciseId:             string;
  exerciseName:           string;
  history:                ProgressEntry[];   // last 12 sessions
  currentWeight:          number;
  trend:                  ProgressTrend;
  consecutiveSuccesses:   number;
  consecutiveFailures:    number;
  deloadRecommended:      boolean;
  lastUpdated:            Timestamp;
  allTimePR: {
    weight: number;
    reps:   number;
    date:   Timestamp;
  };
}

// ─── Weekly Check-ins ──────────────────────────────────────────────────────────

export interface CheckinPhoto {
  url:         string;
  storagePath: string;
  takenAt:     Timestamp;
  note:        string;
  isMain:      boolean;
  pose?:       string;
}

export interface BodyMeasurements {
  chest?:      number;  // cm
  waist?:      number;
  hips?:       number;
  leftArm?:    number;
  rightArm?:   number;
  leftThigh?:  number;
  rightThigh?: number;
}

export interface WeeklyCheckin {
  checkinId:    string;
  uid:          string;
  weekNumber:   number;         // ISO week 1–52
  year:         number;
  weekStart:    Timestamp;      // Monday 00:00 of that week
  createdAt:    Timestamp;
  updatedAt:    Timestamp;
  weight:       number | null;  // kg
  notes:        string;
  mood:         1 | 2 | 3 | 4 | 5 | null;
  photos:       CheckinPhoto[];  // max 5 enforced in app logic
  measurements: BodyMeasurements;
}

// Used when displaying two check-ins side by side for comparison
export interface CheckinComparison {
  weekA: WeeklyCheckin;
  weekB: WeeklyCheckin;
  weightDiff:  number;        // weekB.weight - weekA.weight
  weeksBetween: number;
}

// ─── Social: Posts ─────────────────────────────────────────────────────────────

export interface WorkoutPostSummary {
  logId:        string;
  duration:     number;
  totalVolume:  number;
  exercises:    string[];
  prs:          string[];
  muscleGroups: MuscleGroup[];
}

export interface Post {
  postId:          string;
  uid:             string;
  authorName:      string;
  authorAvatar:    string | null;
  createdAt:       Timestamp;
  imageUrl:        string | null;
  caption:         string;
  isPublic:        boolean;
  workoutSummary:  WorkoutPostSummary;
  likes:           number;
  commentCount:    number;
  likedBy:         string[];  // UIDs; move to subcollection if ever > 500
  tags:            string[];
}

// ─── Social: Friends ───────────────────────────────────────────────────────────

export interface Friendship {
  uid:         string;
  since:       Timestamp;
  displayName: string;
  avatarUrl:   string | null;
}

export interface FriendRequest {
  requestId:  string;
  fromUid:    string;
  fromName:   string;
  fromAvatar: string | null;
  toUid:      string;
  status:     FriendReqStatus;
  createdAt:  Timestamp;
}

// ─── Notes ─────────────────────────────────────────────────────────────────────

export interface WorkoutNote {
  noteId:       string;
  logId:        string;
  exerciseId:   string;
  exerciseName: string;
  content:      string;
  createdAt:    Timestamp;
  updatedAt:    Timestamp;
}
