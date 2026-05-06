import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { colors, spacing, radius, typography } from '../src/theme';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LogExercise {
  exerciseId: string;
  name:       string;
  sets: {
    setNumber: number;
    weight:    number;
    reps:      number;
    completed: boolean;
  }[];
}

interface WorkoutLog {
  logId:       string;
  dayName:     string;
  startTime:   Timestamp;
  duration:    number;
  status:      string;
  exercises:   LogExercise[];
  summary:     { totalVolume: number; duration: number };
}

// ── Calendar helpers ───────────────────────────────────────────────────────────

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function logDateKey(ts: Timestamp): string {
  const d = ts.toDate();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function fmtVolume(vol: number): string {
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k lbs`;
  return `${Math.round(vol)} lbs`;
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function completedSets(ex: LogExercise): number {
  return ex.sets.filter(s => s.completed).length;
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router     = useRouter();
  const { user }   = useAuthStore();
  const today      = new Date();

  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [logs,  setLogs]  = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null); // dateKey

  // ── Fetch logs for current month ───────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const monthStart = new Date(year, month, 1);
      const monthEnd   = new Date(year, month + 1, 1);
      const q = query(
        collection(db, 'users', user.uid, 'logs'),
        where('startTime', '>=', Timestamp.fromDate(monthStart)),
        where('startTime', '<',  Timestamp.fromDate(monthEnd)),
        orderBy('startTime', 'asc'),
      );
      const snap = await getDocs(q);
      const fetched: WorkoutLog[] = snap.docs.map(d => d.data() as WorkoutLog);
      setLogs(fetched);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, year, month]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Build lookup: dateKey → log ────────────────────────────────────────────

  const logByDate: Record<string, WorkoutLog> = {};
  for (const log of logs) {
    const key = logDateKey(log.startTime);
    logByDate[key] = log;
  }

  // ── Month navigation ───────────────────────────────────────────────────────

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth()) return; // no future months
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  // ── Calendar grid ──────────────────────────────────────────────────────────

  const firstDow   = startOfMonth(year, month).getDay(); // 0=Sun
  const totalDays  = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full rows of 7
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey    = toDateKey(today);
  const selectedLog = selected ? logByDate[selected] : null;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Workout History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Month navigation */}
        <View style={s.monthRow}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity
            onPress={nextMonth}
            style={[s.navBtn, year === today.getFullYear() && month === today.getMonth() && s.navBtnDisabled]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color={
              year === today.getFullYear() && month === today.getMonth()
                ? colors.text.muted : colors.text.primary
            } />
          </TouchableOpacity>
        </View>

        {/* Day-of-week labels */}
        <View style={s.dowRow}>
          {DAYS.map(d => (
            <Text key={d} style={s.dowLabel}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={colors.accent.primary} />
          </View>
        ) : (
          <View style={s.grid}>
            {cells.map((day, i) => {
              if (day === null) {
                return <View key={`empty-${i}`} style={s.cell} />;
              }
              const dateKey  = `${year}-${month}-${day}`;
              const hasLog   = !!logByDate[dateKey];
              const isToday  = dateKey === todayKey;
              const isSel    = dateKey === selected;
              const isFuture = new Date(year, month, day) > today;

              return (
                <TouchableOpacity
                  key={dateKey}
                  style={[
                    s.cell,
                    isToday && s.cellToday,
                    isSel   && s.cellSelected,
                  ]}
                  onPress={() => {
                    if (isFuture || !hasLog) { setSelected(null); return; }
                    setSelected(isSel ? null : dateKey);
                  }}
                  activeOpacity={hasLog && !isFuture ? 0.7 : 1}
                >
                  <Text style={[
                    s.dayNum,
                    isToday  && s.dayNumToday,
                    isSel    && s.dayNumSel,
                    isFuture && s.dayNumFuture,
                  ]}>
                    {day}
                  </Text>
                  {hasLog && !isFuture && (
                    <View style={[s.dot, isSel && s.dotSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Monthly summary strip */}
        {!loading && (
          <View style={s.monthSummary}>
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{logs.filter(l => l.status === 'complete').length}</Text>
              <Text style={s.summaryLbl}>Workouts</Text>
            </View>
            <View style={s.summarySep} />
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>
                {fmtVolume(logs.reduce((t, l) => t + (l.summary?.totalVolume ?? 0), 0))}
              </Text>
              <Text style={s.summaryLbl}>Total Volume</Text>
            </View>
            <View style={s.summarySep} />
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>
                {fmtDuration(Math.round(logs.reduce((t, l) => t + (l.duration ?? 0), 0) / Math.max(logs.length, 1)))}
              </Text>
              <Text style={s.summaryLbl}>Avg Duration</Text>
            </View>
          </View>
        )}

        {/* Selected day detail */}
        {selectedLog && (
          <WorkoutDetail log={selectedLog} />
        )}

        {/* Recent workouts list (when nothing selected) */}
        {!selectedLog && !loading && logs.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>This Month</Text>
            {[...logs].reverse().map(log => (
              <RecentRow key={log.logId} log={log} onPress={() => {
                const key = logDateKey(log.startTime);
                setSelected(prev => prev === key ? null : key);
              }} />
            ))}
          </View>
        )}

        {!loading && logs.length === 0 && (
          <View style={s.emptyBox}>
            <Ionicons name="barbell-outline" size={40} color={colors.text.muted} />
            <Text style={s.emptyText}>No workouts logged this month</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Workout detail panel ───────────────────────────────────────────────────────

function WorkoutDetail({ log }: { log: WorkoutLog }) {
  const date = log.startTime.toDate();
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={wd.container}>
      <View style={wd.header}>
        <View>
          <Text style={wd.dayName}>{log.dayName}</Text>
          <Text style={wd.dateStr}>{dateStr}</Text>
        </View>
        <View style={wd.badges}>
          <View style={wd.badge}>
            <Ionicons name="time-outline" size={12} color={colors.text.muted} />
            <Text style={wd.badgeText}>{fmtDuration(log.duration)}</Text>
          </View>
          <View style={wd.badge}>
            <Ionicons name="trending-up-outline" size={12} color={colors.accent.primary} />
            <Text style={[wd.badgeText, { color: colors.accent.primary }]}>
              {fmtVolume(log.summary?.totalVolume ?? 0)}
            </Text>
          </View>
        </View>
      </View>

      {log.exercises?.map((ex, i) => {
        const done  = completedSets(ex);
        const total = ex.sets.length;
        const completedOnly = ex.sets.filter(s => s.completed);
        const avgWeight = completedOnly.length > 0
          ? Math.round(completedOnly.reduce((s, set) => s + set.weight, 0) / completedOnly.length)
          : 0;
        const maxReps = completedOnly.length > 0
          ? Math.max(...completedOnly.map(s => s.reps))
          : 0;

        return (
          <View key={i} style={wd.exRow}>
            <View style={wd.exLeft}>
              <Text style={wd.exName}>{ex.name}</Text>
              <Text style={wd.exSets}>
                {done}/{total} sets
                {avgWeight > 0 ? ` · ${avgWeight} lbs avg` : ''}
                {maxReps > 0  ? ` · up to ${maxReps} reps` : ''}
              </Text>
            </View>
            <View style={[wd.statusDot, done === total && wd.statusDotDone]} />
          </View>
        );
      })}
    </View>
  );
}

const wd = StyleSheet.create({
  container: { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, overflow: 'hidden' },
  header:    { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayName:   { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  dateStr:   { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  badges:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg.elevated, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.text.muted },
  exRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  exLeft:    { flex: 1 },
  exName:    { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  exSets:    { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text.muted },
  statusDotDone: { backgroundColor: colors.accent.success },
});

// ── Recent row (list view) ─────────────────────────────────────────────────────

function RecentRow({ log, onPress }: { log: WorkoutLog; onPress: () => void }) {
  const date    = log.startTime.toDate();
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dow     = date.toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <TouchableOpacity style={rr.row} onPress={onPress} activeOpacity={0.7}>
      <View style={rr.dateBox}>
        <Text style={rr.dow}>{dow}</Text>
        <Text style={rr.date}>{dateStr}</Text>
      </View>
      <View style={rr.info}>
        <Text style={rr.name}>{log.dayName}</Text>
        <Text style={rr.meta}>
          {log.exercises?.length ?? 0} exercises · {fmtDuration(log.duration)} · {fmtVolume(log.summary?.totalVolume ?? 0)}
        </Text>
      </View>
      <View style={[rr.status, log.status === 'complete' && rr.statusDone]}>
        <Ionicons
          name={log.status === 'complete' ? 'checkmark' : 'ellipse-outline'}
          size={14}
          color={log.status === 'complete' ? colors.accent.success : colors.text.muted}
        />
      </View>
    </TouchableOpacity>
  );
}

const rr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateBox:  { alignItems: 'center', width: 44 },
  dow:      { fontSize: 11, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5 },
  date:     { fontSize: 13, fontWeight: '700', color: colors.text.primary, marginTop: 1 },
  info:     { flex: 1 },
  name:     { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  meta:     { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  status:   { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  statusDone: { backgroundColor: `${colors.accent.success}20` },
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title:     { ...typography.h4 },

  scroll:    { padding: spacing.md, paddingBottom: 60 },

  monthRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthLabel:{ fontSize: 18, fontWeight: '700', color: colors.text.primary },
  navBtn:    { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.bg.elevated },
  navBtnDisabled: { opacity: 0.3 },

  dowRow:    { flexDirection: 'row', marginBottom: spacing.xs },
  dowLabel:  { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.text.muted, letterSpacing: 0.5 },

  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  cell:      { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  cellToday: { backgroundColor: colors.bg.elevated },
  cellSelected: { backgroundColor: colors.accent.primary },

  dayNum:       { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  dayNumToday:  { fontWeight: '700' },
  dayNumSel:    { color: '#fff', fontWeight: '700' },
  dayNumFuture: { color: colors.text.muted },

  dot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent.primary, marginTop: 2 },
  dotSelected:{ backgroundColor: '#fff' },

  loadingBox: { height: 200, justifyContent: 'center', alignItems: 'center' },

  monthSummary: { flexDirection: 'row', backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, padding: spacing.md },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryVal:   { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  summaryLbl:   { fontSize: 11, color: colors.text.muted, marginTop: 2, textAlign: 'center' },
  summarySep:   { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },

  section:      { marginTop: spacing.lg },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.text.muted, letterSpacing: 0.8, marginBottom: spacing.sm },

  emptyBox:  { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { fontSize: 14, color: colors.text.muted },
});
