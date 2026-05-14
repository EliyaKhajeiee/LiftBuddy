import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, where, orderBy, getDocs,
  deleteDoc, doc, getDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../src/firebase/config';
import { useAuthStore } from '../src/store/authStore';
import { toDateKey, daysInMonth, startOfMonth, fmtDuration, fmtVolume } from '../src/utils/dateUtils';
import { colors, spacing, radius, typography } from '../src/theme';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LogExercise {
  exerciseId: string;
  name:       string;
  sets: { setNumber: number; weight: number; reps: number; completed: boolean }[];
}

interface WorkoutLog {
  logId:     string;
  dayName:   string;
  startTime: Timestamp;
  duration:  number;
  status:    string;
  exercises: LogExercise[];
  summary:   { totalVolume: number; duration: number };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function logDateKey(ts: Timestamp): string {
  return toDateKey(ts.toDate());
}

function completedSets(ex: LogExercise): number {
  return ex.sets.filter(s => s.completed).length;
}

function getISOWeekId(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const jan1 = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - jan1.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router   = useRouter();
  const { user } = useAuthStore();
  const today    = new Date();

  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth());
  const [logs,    setLogs]    = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  // Check-in photo for selected date
  const [checkinPhoto,   setCheckinPhoto]   = useState<string | null>(null);
  const [loadingCheckin, setLoadingCheckin] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'logs'),
        where('startTime', '>=', Timestamp.fromDate(new Date(year, month, 1))),
        where('startTime', '<',  Timestamp.fromDate(new Date(year, month + 1, 1))),
        orderBy('startTime', 'asc'),
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => d.data() as WorkoutLog));
    } catch { setLogs([]); }
    finally  { setLoading(false); }
  }, [user?.uid, year, month]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Fetch check-in photo when a date is selected
  useEffect(() => {
    if (!selected || !user?.uid) { setCheckinPhoto(null); return; }
    const [y, m, d] = selected.split('-').map(Number);
    const weekId = getISOWeekId(new Date(y, m, d));
    setLoadingCheckin(true);
    getDoc(doc(db, 'weeklyCheckins', user.uid, 'checkins', weekId))
      .then(snap => setCheckinPhoto(snap.data()?.photos?.[0]?.url ?? null))
      .catch(() => setCheckinPhoto(null))
      .finally(() => setLoadingCheckin(false));
  }, [selected, user?.uid]);

  const logByDate: Record<string, WorkoutLog> = {};
  for (const log of logs) logByDate[logDateKey(log.startTime)] = log;

  function prevMonth() {
    setSelected(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (year === today.getFullYear() && month === today.getMonth()) return;
    setSelected(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  }

  const firstDow  = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey    = toDateKey(today);
  const selectedLog = selected ? logByDate[selected] : null;
  const atLatest    = year === today.getFullYear() && month === today.getMonth();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Month nav */}
        <View style={s.monthRow}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={[s.navBtn, atLatest && s.navBtnOff]} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color={atLatest ? colors.text.muted : colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Delete all this month */}
        {logs.length > 0 && (
          <TouchableOpacity
            style={s.deleteMonthBtn}
            activeOpacity={0.8}
            onPress={() => Alert.alert(
              `Delete ${MONTHS[month]}?`,
              `This will permanently delete all ${logs.length} workout${logs.length !== 1 ? 's' : ''} logged in ${MONTHS[month]} ${year}.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete All', style: 'destructive', onPress: async () => {
                  if (!user?.uid) return;
                  setLoading(true);
                  try {
                    await Promise.all(logs.map(log => deleteDoc(doc(db, 'users', user.uid, 'logs', log.logId))));
                    setLogs([]);
                    setSelected(null);
                  } catch { Alert.alert('Error', 'Could not delete. Try again.'); }
                  finally { setLoading(false); }
                }},
              ]
            )}
          >
            <Ionicons name="trash-outline" size={14} color={colors.accent.danger} />
            <Text style={s.deleteMonthText}>Delete all {MONTHS[month]}</Text>
          </TouchableOpacity>
        )}

        {/* DOW labels */}
        <View style={s.dowRow}>
          {DAYS.map(d => <Text key={d} style={s.dowLabel}>{d}</Text>)}
        </View>

        {/* Calendar */}
        {loading ? (
          <View style={s.loadingBox}><ActivityIndicator color={colors.accent.primary} /></View>
        ) : (
          <View style={s.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`e-${i}`} style={s.cell} />;
              const dateKey  = `${year}-${month}-${day}`;
              const hasLog   = !!logByDate[dateKey];
              const isToday  = dateKey === todayKey;
              const isSel    = dateKey === selected;
              const isFuture = new Date(year, month, day) > today;
              return (
                <TouchableOpacity
                  key={dateKey}
                  style={s.cell}
                  onPress={() => {
                    if (isFuture || !hasLog) { setSelected(null); return; }
                    setSelected(isSel ? null : dateKey);
                  }}
                  activeOpacity={hasLog && !isFuture ? 0.75 : 1}
                >
                  <View style={[
                    s.cellInner,
                    hasLog && !isFuture && s.cellInnerHasLog,
                    isToday && s.cellInnerToday,
                    isSel   && s.cellInnerSel,
                  ]}>
                    <Text style={[
                      s.dayNum,
                      isToday  && s.dayNumToday,
                      isSel    && s.dayNumSel,
                      isFuture && s.dayNumFuture,
                      hasLog && !isFuture && !isSel && s.dayNumHasLog,
                    ]}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Stats strip */}
        {!loading && (
          <View style={s.strip}>
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{logs.filter(l => l.status === 'complete').length}</Text>
              <Text style={s.stripLbl}>Workouts</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{fmtVolume(logs.reduce((t, l) => t + (l.summary?.totalVolume ?? 0), 0))}</Text>
              <Text style={s.stripLbl}>Total Volume</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{fmtDuration(Math.round(logs.reduce((t, l) => t + (l.duration ?? 0), 0) / Math.max(logs.length, 1)))}</Text>
              <Text style={s.stripLbl}>Avg Duration</Text>
            </View>
          </View>
        )}

        {/* Selected detail */}
        {selectedLog && (
          <WorkoutDetail
            log={selectedLog}
            checkinPhoto={checkinPhoto}
            loadingCheckin={loadingCheckin}
            onDelete={async () => {
              if (!user?.uid) return;
              Alert.alert('Delete workout?', 'This will permanently remove this log.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  await deleteDoc(doc(db, 'users', user.uid, 'logs', selectedLog.logId));
                  setLogs(prev => prev.filter(l => l.logId !== selectedLog.logId));
                  setSelected(null);
                }},
              ]);
            }}
          />
        )}

        {/* Recent list */}
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

// ── Workout detail ─────────────────────────────────────────────────────────────

function WorkoutDetail({ log, checkinPhoto, loadingCheckin, onDelete }: {
  log: WorkoutLog;
  checkinPhoto: string | null;
  loadingCheckin: boolean;
  onDelete: () => void;
}) {
  const date    = log.startTime.toDate();
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={wd.card}>
      {/* Check-in photo */}
      {loadingCheckin && (
        <View style={wd.photoPlaceholder}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      )}
      {!loadingCheckin && checkinPhoto && (
        <Image source={{ uri: checkinPhoto }} style={wd.photo} resizeMode="cover" />
      )}

      {/* Header */}
      <View style={wd.header}>
        <View style={{ flex: 1 }}>
          <Text style={wd.dayName}>{log.dayName}</Text>
          <Text style={wd.dateStr}>{dateStr}</Text>
        </View>
        <View style={wd.badges}>
          <View style={wd.badge}>
            <Ionicons name="time-outline" size={12} color={colors.text.muted} />
            <Text style={wd.badgeText}>{fmtDuration(log.duration)}</Text>
          </View>
          <View style={[wd.badge, wd.badgeAccent]}>
            <Ionicons name="trending-up-outline" size={12} color={colors.accent.primary} />
            <Text style={[wd.badgeText, { color: colors.accent.primary }]}>
              {fmtVolume(log.summary?.totalVolume ?? 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Exercise rows */}
      {log.exercises?.map((ex, i) => {
        const done  = completedSets(ex);
        const total = ex.sets.length;
        const comp  = ex.sets.filter(s => s.completed);
        const avg   = comp.length > 0 ? Math.round(comp.reduce((s, set) => s + set.weight, 0) / comp.length) : 0;
        const maxR  = comp.length > 0 ? Math.max(...comp.map(s => s.reps)) : 0;
        return (
          <View key={i} style={wd.exRow}>
            <View style={{ flex: 1 }}>
              <Text style={wd.exName}>{ex.name}</Text>
              <Text style={wd.exMeta}>
                {done}/{total} sets{avg > 0 ? ` · ${avg} lbs avg` : ''}{maxR > 0 ? ` · ${maxR} reps max` : ''}
              </Text>
            </View>
            <View style={[wd.dot, done === total && wd.dotDone]} />
          </View>
        );
      })}

      <TouchableOpacity style={wd.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={14} color={colors.accent.danger} />
        <Text style={wd.deleteTxt}>Delete this workout</Text>
      </TouchableOpacity>
    </View>
  );
}

const wd = StyleSheet.create({
  card:            { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, overflow: 'hidden' },
  photo:           { width: '100%', height: 200 },
  photoPlaceholder:{ height: 80, justifyContent: 'center', alignItems: 'center' },
  header:          { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayName:         { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  dateStr:         { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  badges:          { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  badge:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg.elevated, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeAccent:     { backgroundColor: `${colors.accent.primary}12` },
  badgeText:       { fontSize: 12, fontWeight: '600', color: colors.text.muted },
  exRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  exName:          { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  exMeta:          { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  dot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text.muted },
  dotDone:         { backgroundColor: colors.accent.success },
  deleteBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  deleteTxt:       { fontSize: 13, color: colors.accent.danger },
});

// ── Recent row ─────────────────────────────────────────────────────────────────

function RecentRow({ log, onPress }: { log: WorkoutLog; onPress: () => void }) {
  const date = log.startTime.toDate();
  return (
    <TouchableOpacity style={rr.row} onPress={onPress} activeOpacity={0.7}>
      <View style={rr.dateBox}>
        <Text style={rr.dow}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
        <Text style={rr.date}>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
      </View>
      <View style={rr.info}>
        <Text style={rr.name}>{log.dayName}</Text>
        <Text style={rr.meta}>
          {log.exercises?.length ?? 0} exercises · {fmtDuration(log.duration)} · {fmtVolume(log.summary?.totalVolume ?? 0)}
        </Text>
      </View>
      <View style={[rr.status, log.status === 'complete' && rr.statusDone]}>
        <Ionicons name={log.status === 'complete' ? 'checkmark' : 'ellipse-outline'} size={14}
          color={log.status === 'complete' ? colors.accent.success : colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

const rr = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateBox:   { alignItems: 'center', width: 44 },
  dow:       { fontSize: 11, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5 },
  date:      { fontSize: 13, fontWeight: '700', color: colors.text.primary, marginTop: 1 },
  info:      { flex: 1 },
  name:      { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  meta:      { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  status:    { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg.elevated, justifyContent: 'center', alignItems: 'center' },
  statusDone:{ backgroundColor: `${colors.accent.success}20` },
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title:     { ...typography.h4 },
  scroll:    { padding: spacing.md, paddingBottom: 60 },

  monthRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthLabel:     { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  navBtn:         { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.bg.elevated },
  navBtnOff:      { opacity: 0.3 },
  deleteMonthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginBottom: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: `${colors.accent.danger}30`, backgroundColor: `${colors.accent.danger}08` },
  deleteMonthText:{ fontSize: 13, fontWeight: '600', color: colors.accent.danger },

  dowRow:   { flexDirection: 'row', marginBottom: 4 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.text.muted, letterSpacing: 0.5 },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  cell:     { width: `${100/7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellInner:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cellInnerHasLog:{ backgroundColor: `${colors.accent.primary}25` },
  cellInnerToday: { borderWidth: 1.5, borderColor: `${colors.accent.primary}60` },
  cellInnerSel:   { backgroundColor: colors.accent.primary },

  dayNum:       { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
  dayNumHasLog: { fontWeight: '700', color: colors.text.primary },
  dayNumToday:  { fontWeight: '700', color: colors.accent.primary },
  dayNumSel:    { color: '#fff', fontWeight: '700' },
  dayNumFuture: { color: colors.text.muted, opacity: 0.4 },

  loadingBox: { height: 200, justifyContent: 'center', alignItems: 'center' },

  strip:    { flexDirection: 'row', backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  stripItem:{ flex: 1, alignItems: 'center' },
  stripVal: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  stripLbl: { fontSize: 11, color: colors.text.muted, marginTop: 2, textAlign: 'center' },
  stripSep: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },

  section:      { marginTop: spacing.sm },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.text.muted, letterSpacing: 0.8, marginBottom: spacing.sm },

  emptyBox:  { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { fontSize: 14, color: colors.text.muted },
});
