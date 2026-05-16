import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import { useAuthStore }   from '../../src/store/authStore';
import { useUserStore }   from '../../src/store/userStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { generatePlan }   from '../../src/utils/generatePlan';
import { getDayQuote }    from '../../src/data/muscleQuotes';
import { colors, spacing, radius, typography } from '../../src/theme';
import { Skeleton, SkeletonCard } from '../../src/components/Skeleton';
import { useState, useEffect } from 'react';
import type { WeekDay, WorkoutDay, WorkoutPlan, ExercisePlan } from '../../src/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function planToActive(exercises: ExercisePlan[]) {
  return exercises.map(pe => ({
    exerciseId:     pe.exerciseId,
    exerciseName:   pe.exerciseName,
    primaryMuscles: [] as any[],
    targetSets:     pe.sets,
    repMin:         pe.repMin,
    repMax:         pe.repMax,
    restSeconds:    pe.restSeconds ?? 90,
    sets: Array.from({ length: pe.sets }, (_, i) => ({
      setNumber:    i + 1,
      prevWeight:   0,
      prevReps:     0,
      weight:       '',
      reps:         String(pe.repMin),
      completed:    false,
      weightEdited: false,
      repsEdited:   false,
    })),
  }));
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DOW_ORDER: WeekDay[]  = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_LABEL: Record<WeekDay, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const DAY_SHORT: Record<WeekDay, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed',
  thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

function todayKey(): WeekDay {
  return DOW_ORDER[new Date().getDay()];
}

function totalSets(day: WorkoutDay): number {
  return day.exercises.reduce((n, e) => n + e.sets, 0);
}

function isDayLogged(_plan: WorkoutPlan, dayKey: string, lastSessions: any): boolean {
  const ls = lastSessions?.[dayKey];
  if (!ls?.date) return false;
  try {
    const d = ls.date.toDate ? ls.date.toDate() : new Date(ls.date);
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    return d >= monday;
  } catch { return false; }
}

// ── Week strip ─────────────────────────────────────────────────────────────────

function WeekStrip({ plan, today, selectedDayKey, lastSessions, onDayPress }: {
  plan: WorkoutPlan;
  today: WeekDay;
  selectedDayKey: string | null;
  lastSessions?: any;
  onDayPress: (dayKey: string, day: WorkoutDay) => void;
}) {
  if (!plan.schedule) return null;
  return (
    <View style={ws.wrap}>
      {DOW_ORDER.slice(1).concat(DOW_ORDER[0]).map(d => {
        const dayKey     = plan.schedule?.[d] ?? null;
        const day        = dayKey ? plan.days[dayKey] : null;
        const isToday    = d === today;
        const isSelected = !!dayKey && dayKey === selectedDayKey;
        const isLogged   = dayKey ? isDayLogged(plan, dayKey, lastSessions) : false;
        const isRest     = !dayKey;

        return (
          <TouchableOpacity
            key={d}
            style={[ws.col, isToday && ws.colToday, isSelected && !isToday && ws.colSelected]}
            onPress={() => { if (day && dayKey) onDayPress(dayKey, day); }}
            activeOpacity={day ? 0.7 : 1}
          >
            <Text style={[ws.dayLabel, isToday && ws.dayLabelToday, isSelected && !isToday && ws.dayLabelSelected]}>
              {DAY_SHORT[d]}
            </Text>
            <View style={[
              ws.dot,
              isLogged  && ws.dotDone,
              isToday   && !isLogged && ws.dotToday,
              isSelected && !isLogged && ws.dotSelected,
              isRest    && ws.dotRest,
            ]}>
              {isLogged && <Ionicons name="checkmark" size={9} color="#fff" />}
            </View>
            <Text style={[ws.workoutLabel, (isToday || isSelected) && ws.workoutLabelActive]} numberOfLines={1}>
              {day ? day.name.split('—')[0].trim().split(' ').slice(-1)[0] : 'Rest'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ws = StyleSheet.create({
  wrap:              { flexDirection: 'row', paddingHorizontal: spacing.md, gap: 2 },
  col:               { flex: 1, alignItems: 'center', gap: 5, paddingVertical: spacing.sm, borderRadius: radius.md },
  colToday:          { backgroundColor: `${colors.accent.primary}10` },
  colSelected:       { backgroundColor: `${colors.text.primary}08` },
  dayLabel:          { fontSize: 10, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5 },
  dayLabelToday:     { color: colors.accent.primary },
  dayLabelSelected:  { color: colors.text.primary },
  dot:               { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  dotToday:          { borderColor: colors.accent.primary, backgroundColor: `${colors.accent.primary}20` },
  dotSelected:       { borderColor: colors.text.muted },
  dotDone:           { backgroundColor: colors.accent.success, borderColor: colors.accent.success },
  dotRest:           { backgroundColor: 'transparent', borderStyle: 'dashed' },
  workoutLabel:      { fontSize: 8, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  workoutLabelActive:{ color: colors.accent.primary },
});

// ── Exercise preview row ───────────────────────────────────────────────────────

function ExRow({ order, name, sets, repMin, repMax }: {
  order: number; name: string; sets: number; repMin: number; repMax: number;
}) {
  return (
    <View style={ex.row}>
      <View style={ex.num}><Text style={ex.numText}>{order + 1}</Text></View>
      <Text style={ex.name} numberOfLines={1}>{name}</Text>
      <Text style={ex.vol}>{sets} × {repMin}–{repMax}</Text>
    </View>
  );
}
const ex = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  num:     { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  numText: { fontSize: 9, fontWeight: '800', color: colors.text.muted },
  name:    { flex: 1, fontSize: 13, color: colors.text.secondary },
  vol:     { fontSize: 12, fontWeight: '700', color: colors.text.muted },
});

// ── Main ───────────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const router              = useRouter();
  const { user }            = useAuthStore();
  const { data, loading }   = useUserStore();
  const { status, startSession, startCustom } = useWorkoutStore();
  const [generating, setGenerating] = useState(false);
  const [showSwap,   setShowSwap]   = useState(false);
  const [selDayKey,  setSelDayKey]  = useState<string | null>(null);

  const profile      = data?.profile;
  const plan         = data?.plan;
  const lastSessions = data?.lastSessions;
  const today        = todayKey();

  const todayDayKey   = plan?.schedule?.[today] ?? null;
  const sessionActive = status === 'active';

  // Default selection to today's day when plan loads
  useEffect(() => {
    if (todayDayKey && selDayKey === null) setSelDayKey(todayDayKey);
  }, [todayDayKey]);

  const viewingDayKey = selDayKey ?? todayDayKey;
  const viewingDay    = viewingDayKey ? plan?.days[viewingDayKey] : null;
  const viewingLogged = viewingDayKey ? isDayLogged(plan!, viewingDayKey, lastSessions) : false;
  const isViewingToday = viewingDayKey === todayDayKey;

  async function handleGenerate() {
    if (!user?.uid || !profile) return;
    setGenerating(true);
    try {
      const newPlan = generatePlan(profile, user.uid);
      await setDoc(doc(db, 'users', user.uid), { plan: newPlan }, { merge: true });
    } catch { Alert.alert('Error', 'Could not generate plan. Try again.'); }
    finally { setGenerating(false); }
  }

  function handleStartDay(dayKey: string) {
    if (!user?.uid || !plan) return;
    if (sessionActive) {
      (router.push as any)('/workout-session');
      return;
    }
    const ls = lastSessions?.[dayKey];
    startSession(user.uid, plan, dayKey, ls);
    (router.push as any)('/workout-session');
  }

  function handleStartSecondary(name: string, exercises: ExercisePlan[]) {
    if (!user?.uid) return;
    if (sessionActive) {
      Alert.alert('Workout active', 'Finish your current workout before starting another.');
      return;
    }
    startCustom(user.uid, name, planToActive(exercises));
    (router.push as any)('/workout-session');
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.topBar}>
        <View>
          <Text style={s.dateText}>{DAY_LABEL[today].toUpperCase()}</Text>
          <Text style={s.title}>{plan ? (viewingDay ? viewingDay.name : 'Rest Day') : 'Workout'}</Text>
        </View>
        <View style={s.topBtns}>
          <TouchableOpacity style={s.iconBtn} onPress={() => (router.push as any)('/history')} activeOpacity={0.7}>
            <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
          {plan && (
            <TouchableOpacity style={s.manageBtn} onPress={() => (router.push as any)('/schedule')} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
              <Text style={s.manageBtnText}>Schedule</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {loading && !data ? (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              {[0,1,2,3,4,5,6].map(i => (
                <SkeletonCard key={i} style={{ flex: 1, padding: 10, gap: 6 }}>
                  <Skeleton height={10} width="100%" />
                  <Skeleton height={28} width="100%" borderRadius={14} />
                </SkeletonCard>
              ))}
            </View>
            <SkeletonCard style={{ gap: 12 }}>
              <Skeleton height={18} width="50%" />
              <Skeleton height={13} width="70%" />
              <Skeleton height={52} borderRadius={14} style={{ marginTop: 4 }} />
            </SkeletonCard>
          </>
        ) : plan ? (
          <>
            {/* Week strip */}
            <WeekStrip
              plan={plan}
              today={today}
              selectedDayKey={viewingDayKey}
              lastSessions={lastSessions}
              onDayPress={(dayKey) => setSelDayKey(dayKey)}
            />

            {/* Viewing non-today indicator */}
            {!isViewingToday && viewingDay && (
              <TouchableOpacity
                style={s.viewingBanner}
                onPress={() => setSelDayKey(todayDayKey)}
                activeOpacity={0.7}
              >
                <Text style={s.viewingText}>Viewing {viewingDay.name}</Text>
                <Text style={s.viewingBack}>← Back to today</Text>
              </TouchableOpacity>
            )}

            {/* Selected day's workout or rest day */}
            {viewingDay && viewingDayKey ? (
              <TodayCard
                day={viewingDay}
                logged={viewingLogged}
                sessionActive={sessionActive}
                onStart={() => handleStartDay(viewingDayKey)}
                onStartSecondary={(name, exs) => handleStartSecondary(name, exs)}
                onSwitchDay={() => setShowSwap(true)}
              />
            ) : (
              <RestDayCard quote={getDayQuote('rest')} onSwitchDay={() => setShowSwap(true)} hasPlan={!!plan} />
            )}

            {/* Manage */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => (router.push as any)('/import-plan')}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={colors.text.secondary} />
                <Text style={s.actionBtnText}>Import Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => (router.push as any)('/custom-workout')}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={colors.text.secondary} />
                <Text style={s.actionBtnText}>Custom Workout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => Alert.alert('Regenerate Plan', 'This will replace your current plan.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Regenerate', onPress: handleGenerate },
                ])}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.text.secondary} />
                <Text style={s.actionBtnText}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <GeneratePlanEmpty profile={profile} onGenerate={handleGenerate} generating={generating} onImport={() => (router.push as any)('/import-plan')} />
        )}

      </ScrollView>

      {/* Day swap modal */}
      {plan && (
        <DaySwapModal
          visible={showSwap}
          plan={plan}
          lastSessions={lastSessions}
          onSelect={dayKey => {
            setShowSwap(false);
            // Let modal finish closing before navigating to avoid splash screen conflict
            setTimeout(() => handleStartDay(dayKey), 300);
          }}
          onClose={() => setShowSwap(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Today card ─────────────────────────────────────────────────────────────────

function TodayCard({ day, logged, sessionActive, onStart, onStartSecondary, onSwitchDay }: {
  day: WorkoutDay;
  logged: boolean;
  sessionActive: boolean;
  onStart: () => void;
  onStartSecondary: (name: string, exercises: ExercisePlan[]) => void;
  onSwitchDay: () => void;
}) {
  const sets = totalSets(day);
  const secondarySessions = (day.sessions ?? []).slice(1);

  return (
    <View style={tc.card}>
      <View style={tc.accentBar} />
      <View style={tc.inner}>

        {/* Meta row */}
        <View style={tc.metaRow}>
          <View style={tc.tag}>
            <Text style={tc.tagText}>{day.exercises.length} EXERCISES</Text>
          </View>
          <View style={tc.tag}>
            <Text style={tc.tagText}>{sets} SETS</Text>
          </View>
          {secondarySessions.length > 0 && (
            <View style={[tc.tag, tc.tagSecondary]}>
              <Ionicons name="layers-outline" size={9} color={colors.accent.secondary} />
              <Text style={[tc.tagText, { color: colors.accent.secondary }]}>
                +{secondarySessions.length} SESSION{secondarySessions.length > 1 ? 'S' : ''}
              </Text>
            </View>
          )}
          {logged && (
            <View style={[tc.tag, tc.tagDone]}>
              <Ionicons name="checkmark-circle" size={10} color={colors.accent.success} />
              <Text style={[tc.tagText, { color: colors.accent.success }]}>DONE TODAY</Text>
            </View>
          )}
        </View>

        {/* Primary exercises */}
        <View style={tc.exList}>
          {day.exercises.map((e, i) => (
            <ExRow key={e.exerciseId} order={i} name={e.exerciseName} sets={e.sets} repMin={e.repMin} repMax={e.repMax} />
          ))}
        </View>

        {/* Primary start button */}
        <TouchableOpacity
          style={[tc.startBtn, logged && !sessionActive && tc.startBtnLogged]}
          onPress={onStart}
          activeOpacity={0.9}
        >
          <Ionicons name="play" size={16} color="#fff" />
          <Text style={tc.startText}>
            {logged && !sessionActive ? 'Log Again' : 'Begin Workout'}
          </Text>
        </TouchableOpacity>

        {/* Switch day */}
        <TouchableOpacity style={tc.switchBtn} onPress={onSwitchDay} activeOpacity={0.7}>
          <Ionicons name="swap-vertical-outline" size={13} color={colors.text.muted} />
          <Text style={tc.switchText}>Do a different day</Text>
        </TouchableOpacity>

        {/* Secondary sessions */}
        {secondarySessions.map((sess, si) => (
          <View key={si} style={tc.secondaryBlock}>
            <View style={tc.secondaryDivider}>
              <View style={tc.secondaryLine} />
              <Text style={tc.secondaryLabel}>{sess.name.toUpperCase()}</Text>
              <View style={tc.secondaryLine} />
            </View>
            <View style={tc.exList}>
              {sess.exercises.map((e, i) => (
                <ExRow key={e.exerciseId} order={i} name={e.exerciseName} sets={e.sets} repMin={e.repMin} repMax={e.repMax} />
              ))}
            </View>
            <TouchableOpacity
              style={tc.secondaryBtn}
              onPress={() => onStartSecondary(sess.name, sess.exercises)}
              activeOpacity={0.9}
            >
              <Ionicons name="play" size={14} color={colors.accent.secondary} />
              <Text style={tc.secondaryBtnText}>Start {sess.name}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  card:     { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg.card, overflow: 'hidden' },
  accentBar:{ height: 3, backgroundColor: colors.accent.primary },
  inner:    { padding: spacing.md, gap: spacing.md },
  metaRow:  { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  tag:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  tagDone:     { backgroundColor: `${colors.accent.success}15`, borderWidth: 1, borderColor: `${colors.accent.success}40` },
  tagSecondary:{ backgroundColor: `${colors.accent.secondary}12`, borderWidth: 1, borderColor: `${colors.accent.secondary}30` },
  tagText:     { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: colors.text.muted },

  exList: { gap: 0, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },

  startBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.md, height: 52, marginTop: spacing.xs },
  startBtnActive: { backgroundColor: colors.accent.secondary },
  startBtnLogged: { backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border },
  startText:      { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  secondaryBlock:   { gap: spacing.sm },
  secondaryDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secondaryLine:    { flex: 1, height: 1, backgroundColor: colors.border },
  secondaryLabel:   { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted },
  secondaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.accent.secondary, borderRadius: radius.md, height: 46, marginTop: spacing.xs },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.accent.secondary },
  switchBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.xs },
  switchText:       { fontSize: 12, color: colors.text.muted },
});

// ── Rest day card ──────────────────────────────────────────────────────────────

function RestDayCard({ quote, onSwitchDay, hasPlan }: { quote: any; onSwitchDay: () => void; hasPlan: boolean }) {
  return (
    <View style={rd.card}>
      <View style={rd.icon}>
        <Ionicons name="moon-outline" size={26} color={colors.text.muted} />
      </View>
      <Text style={rd.title}>Rest Day</Text>
      <View style={rd.quoteWrap}>
        <Text style={rd.quoteText}>"{quote.text}"</Text>
        <Text style={rd.quoteAuthor}>— {quote.author}</Text>
      </View>
      {hasPlan && (
        <TouchableOpacity style={rd.switchBtn} onPress={onSwitchDay} activeOpacity={0.7}>
          <Ionicons name="swap-vertical-outline" size={13} color={colors.text.muted} />
          <Text style={rd.switchText}>Train anyway — pick a day</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const rd = StyleSheet.create({
  card:       { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  icon:       { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  title:      { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  quoteWrap:  { alignItems: 'center', gap: 5 },
  quoteText:  { fontSize: 13, fontStyle: 'italic', color: colors.text.secondary, lineHeight: 20, textAlign: 'center' },
  quoteAuthor:{ fontSize: 11, fontWeight: '700', color: colors.text.muted },
  switchBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  switchText: { fontSize: 12, color: colors.text.muted },
});

// ── Last session recap ─────────────────────────────────────────────────────────

function LastSessionRecap({ lastSession }: { dayKey: string; lastSession: any }) {
  const dateStr = (() => {
    try {
      const d: Date = lastSession.date?.toDate ? lastSession.date.toDate() : new Date(lastSession.date);
      const diff = Math.round((Date.now() - d.getTime()) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      return `${diff} days ago`;
    } catch { return ''; }
  })();

  const exs: any[] = lastSession.exercises ?? [];
  const totalVol = exs.reduce(
    (t: number, ex: any) => t + (ex.sets ?? []).reduce((s: number, set: any) => s + (set.completed ? set.weight * set.reps : 0), 0),
    0,
  );

  return (
    <View style={ls.wrap}>
      <View style={ls.header}>
        <Text style={ls.label}>LAST SESSION</Text>
        <Text style={ls.date}>{dateStr}</Text>
      </View>
      {exs.slice(0, 4).map((ex: any, i: number) => {
        const best = (ex.sets ?? []).reduce((b: any, s: any) => (!b || s.weight > b.weight ? s : b), null);
        return (
          <View key={i} style={ls.exRow}>
            <Text style={ls.exName} numberOfLines={1}>{ex.name}</Text>
            {best ? (
              <Text style={ls.exVal}>{best.weight} lbs × {best.reps}</Text>
            ) : null}
          </View>
        );
      })}
      {totalVol > 0 && (
        <View style={ls.footer}>
          <Ionicons name="barbell-outline" size={12} color={colors.text.muted} />
          <Text style={ls.footerText}>{totalVol.toLocaleString()} lbs total volume</Text>
        </View>
      )}
    </View>
  );
}
const ls = StyleSheet.create({
  wrap:      { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:     { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.text.muted },
  date:      { fontSize: 11, fontWeight: '600', color: colors.accent.primary },
  exRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3, borderTopWidth: 1, borderTopColor: colors.border },
  exName:    { fontSize: 13, color: colors.text.secondary, flex: 1 },
  exVal:     { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  footer:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  footerText:{ fontSize: 11, color: colors.text.muted },
});

// ── Day swap modal ─────────────────────────────────────────────────────────────

function DaySwapModal({ visible, plan, lastSessions, onSelect, onClose }: {
  visible: boolean;
  plan: WorkoutPlan;
  lastSessions: any;
  onSelect: (dayKey: string) => void;
  onClose: () => void;
}) {
  const days = Object.entries(plan.days).map(([key, day]) => ({ key, day }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={dsm.container}>
        <View style={dsm.header}>
          <Text style={dsm.title}>Choose a Day</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={days}
          keyExtractor={item => item.key}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          renderItem={({ item }) => {
            const logged = isDayLogged(plan, item.key, lastSessions);
            const sets   = totalSets(item.day);
            return (
              <TouchableOpacity style={dsm.row} onPress={() => onSelect(item.key)} activeOpacity={0.7}>
                <View style={dsm.rowLeft}>
                  <Text style={dsm.dayName}>{item.day.name}</Text>
                  <Text style={dsm.dayMeta}>
                    {item.day.exercises.length} exercises · {sets} sets
                  </Text>
                </View>
                <View style={dsm.rowRight}>
                  {logged && (
                    <View style={dsm.doneBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.accent.success} />
                      <Text style={dsm.doneTxt}>Done today</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const dsm = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:     { fontSize: 20, fontWeight: '600', color: colors.text.primary },
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowLeft:   { flex: 1 },
  dayName:   { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  dayMeta:   { fontSize: 12, color: colors.text.muted, marginTop: 3 },
  rowRight:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.accent.success}15`, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  doneTxt:   { fontSize: 11, fontWeight: '600', color: colors.accent.success },
});

// ── No-plan empty state ────────────────────────────────────────────────────────

function GeneratePlanEmpty({ profile, onGenerate, generating, onImport }: {
  profile: any; onGenerate: () => void; generating: boolean; onImport: () => void;
}) {
  return (
    <View style={gp.wrap}>
      <View style={gp.icon}>
        <Ionicons name="barbell" size={36} color={colors.accent.primary} />
      </View>
      <Text style={gp.title}>No Program Yet</Text>
      <Text style={gp.sub}>Get a personalized training plan built around your goal, schedule, and equipment.</Text>

      {profile && (
        <View style={gp.chips}>
          <View style={gp.chip}><Text style={gp.chipText}>{profile.goal === 'bulk' ? 'Muscle' : profile.goal === 'cut' ? 'Fat Loss' : 'Strength'}</Text></View>
          <View style={gp.chip}><Text style={gp.chipText}>{profile.daysPerWeek}×/week</Text></View>
          <View style={gp.chip}><Text style={gp.chipText}>{profile.experience}</Text></View>
          <View style={gp.chip}><Text style={gp.chipText}>{profile.location === 'gym' ? 'Gym' : 'Home'}</Text></View>
        </View>
      )}

      <TouchableOpacity style={[gp.btn, generating && gp.btnDisabled]} onPress={onGenerate} disabled={generating} activeOpacity={0.9}>
        {generating
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Ionicons name="flash" size={18} color="#fff" /><Text style={gp.btnText}>Generate My Program</Text></>
        }
      </TouchableOpacity>
      <TouchableOpacity style={gp.importBtn} onPress={onImport} activeOpacity={0.7}>
        <Ionicons name="cloud-upload-outline" size={16} color={colors.text.secondary} />
        <Text style={gp.importBtnText}>Import from CSV</Text>
      </TouchableOpacity>
    </View>
  );
}
const gp = StyleSheet.create({
  wrap:          { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  icon:          { width: 72, height: 72, borderRadius: 36, backgroundColor: `${colors.accent.primary}15`, justifyContent: 'center', alignItems: 'center' },
  title:         { ...typography.h3 },
  sub:           { ...typography.bodySmall, textAlign: 'center', lineHeight: 20 },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
  chip:          { backgroundColor: colors.bg.elevated, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  chipText:      { fontSize: 12, fontWeight: '600', color: colors.text.secondary, textTransform: 'capitalize' },
  btn:           { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, height: 52, marginTop: spacing.sm },
  btnDisabled:   { opacity: 0.5 },
  btnText:       { color: '#fff', fontWeight: '800', fontSize: 16 },
  importBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 44 },
  importBtnText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateText:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: colors.text.muted },
  title:     { fontSize: 22, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
  topBtns:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn:   { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.card },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  manageBtnText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  scroll:    { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  viewingBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg.elevated, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  viewingText:   { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  viewingBack:   { fontSize: 12, color: colors.text.muted },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.sm + 2, backgroundColor: colors.bg.card },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
});
